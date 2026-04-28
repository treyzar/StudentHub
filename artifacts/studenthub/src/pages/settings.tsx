import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getGetWeekQueryKey,
  getListLessonsQueryKey,
  getGetDashboardTodayQueryKey,
} from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  FileSpreadsheet,
  ExternalLink,
  LogOut,
  Download,
  Upload,
  Trash2,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import {
  useSettings,
  type ThemeMode,
  type Density,
} from "@/contexts/settings";
import type { TimeFormat } from "@/lib/time";
import { RotateCcw } from "lucide-react";

const apiUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

type GoogleStatus = {
  configured: boolean;
  connected: boolean;
  account: {
    email: string;
    name: string | null;
    picture: string | null;
    connectedAt: string;
  } | null;
};

type CalendarEvent = {
  id: string;
  summary: string;
  description: string | null;
  location: string | null;
  htmlLink: string | null;
  start: string | null;
  end: string | null;
  allDay: boolean;
};

type Spreadsheet = {
  id: string;
  name: string;
  modifiedTime: string | null;
  webViewLink: string | null;
  owner: string | null;
};

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function GoogleSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const statusQuery = useQuery<GoogleStatus>({
    queryKey: ["google-status"],
    queryFn: async () => {
      const res = await fetch(apiUrl("api/google/status"));
      if (!res.ok) throw new Error("Не удалось получить статус Google");
      return res.json();
    },
  });

  const eventsQuery = useQuery<{ events: CalendarEvent[] }>({
    queryKey: ["google-calendar-upcoming"],
    queryFn: async () => {
      const res = await fetch(apiUrl("api/google/calendar/upcoming"));
      if (!res.ok) throw new Error("Не удалось получить события");
      return res.json();
    },
    enabled: statusQuery.data?.connected === true,
  });

  const sheetsQuery = useQuery<{ spreadsheets: Spreadsheet[] }>({
    queryKey: ["google-sheets-list"],
    queryFn: async () => {
      const res = await fetch(apiUrl("api/google/sheets/list"));
      if (!res.ok) throw new Error("Не удалось получить таблицы");
      return res.json();
    },
    enabled: statusQuery.data?.connected === true,
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("api/google/disconnect"), { method: "POST" });
      if (!res.ok) throw new Error("Не удалось отключить аккаунт");
    },
    onSuccess: () => {
      toast({ title: "Аккаунт Google отключён" });
      queryClient.invalidateQueries({ queryKey: ["google-status"] });
      queryClient.removeQueries({ queryKey: ["google-calendar-upcoming"] });
      queryClient.removeQueries({ queryKey: ["google-sheets-list"] });
    },
  });

  const importMutation = useMutation<{
    ok: boolean;
    total: number;
    created: number;
    updated: number;
    skipped: number;
  }>({
    mutationFn: async () => {
      const res = await fetch(apiUrl("api/google/calendar/import"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysBack: 30, daysAhead: 90 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Не удалось импортировать события");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Импорт завершён",
        description: `Добавлено: ${data.created}, обновлено: ${data.updated}${
          data.skipped ? `, пропущено: ${data.skipped}` : ""
        }`,
      });
      queryClient.invalidateQueries({ queryKey: getGetWeekQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListLessonsQueryKey() });
      queryClient.invalidateQueries({
        queryKey: getGetDashboardTodayQueryKey(),
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Не удалось импортировать",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Show toast on return from OAuth (?google=ok|error)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("google");
    if (result === "ok") {
      toast({ title: "Google аккаунт подключён" });
      queryClient.invalidateQueries({ queryKey: ["google-status"] });
    } else if (result === "error") {
      toast({
        title: "Не удалось подключить Google",
        description: params.get("reason") ?? undefined,
        variant: "destructive",
      });
    }
    if (result) {
      const url = new URL(window.location.href);
      url.searchParams.delete("google");
      url.searchParams.delete("reason");
      window.history.replaceState({}, "", url.toString());
    }
  }, [toast, queryClient]);

  if (statusQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Google аккаунт</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Загрузка…</p>
        </CardContent>
      </Card>
    );
  }

  const status = statusQuery.data;

  if (!status?.configured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Google аккаунт</CardTitle>
          <CardDescription>
            Чтобы подключить Google Calendar и Google Sheets, нужно настроить OAuth-ключи
            в Google Cloud Console и задать переменные{" "}
            <code className="text-xs px-1 py-0.5 bg-secondary rounded">GOOGLE_CLIENT_ID</code>{" "}
            и{" "}
            <code className="text-xs px-1 py-0.5 bg-secondary rounded">GOOGLE_CLIENT_SECRET</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Подробная пошаговая инструкция (на русском) находится в файле
            <code className="ml-1 text-xs px-1 py-0.5 bg-secondary rounded">
              docs/google-cloud-setup.ru.md
            </code>{" "}
            в корне проекта.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!status.connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Google аккаунт</CardTitle>
          <CardDescription>
            Войдите через Google, чтобы видеть свой календарь и таблицы прямо в StudentHub.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href={apiUrl("api/google/auth?returnTo=/settings")}>
              Войти через Google
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const account = status.account!;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Google аккаунт</CardTitle>
          <CardDescription>
            Аккаунт подключён. Можно работать с календарём и таблицами.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {account.picture ? (
              <img
                src={account.picture}
                alt=""
                className="h-10 w-10 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-muted" />
            )}
            <div>
              <div className="font-medium">{account.name ?? account.email}</div>
              <div className="text-sm text-muted-foreground">{account.email}</div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Отключить
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Ближайшие события календаря
          </CardTitle>
          <CardDescription>
            События из основного Google Calendar на ближайшие две недели.
            Можно импортировать их в расписание (Сегодня / Неделя / Месяц).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              size="sm"
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending}
            >
              <Download className="h-4 w-4 mr-2" />
              {importMutation.isPending
                ? "Импортирую..."
                : "Импортировать в расписание"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Диапазон: −30 / +90 дней. Повторный импорт безопасен — события
              обновляются по их Google ID, дубликаты не создаются.
            </span>
          </div>
          {eventsQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Загрузка…</p>
          )}
          {eventsQuery.isError && (
            <p className="text-sm text-destructive">
              Не удалось загрузить события календаря.
            </p>
          )}
          {eventsQuery.data && eventsQuery.data.events.length === 0 && (
            <p className="text-sm text-muted-foreground">Нет ближайших событий.</p>
          )}
          {eventsQuery.data && eventsQuery.data.events.length > 0 && (
            <ul className="divide-y">
              {eventsQuery.data.events.map((event) => (
                <li key={event.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{event.summary}</div>
                    <div className="text-sm text-muted-foreground">
                      {event.allDay
                        ? formatDate(event.start)
                        : formatDateTime(event.start)}
                      {event.location ? ` · ${event.location}` : ""}
                    </div>
                  </div>
                  {event.htmlLink && (
                    <a
                      href={event.htmlLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary hover:underline shrink-0 flex items-center gap-1"
                    >
                      Открыть
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Google Таблицы
          </CardTitle>
          <CardDescription>
            Последние изменённые таблицы из вашего Google Drive.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sheetsQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Загрузка…</p>
          )}
          {sheetsQuery.isError && (
            <p className="text-sm text-destructive">
              Не удалось загрузить таблицы.
            </p>
          )}
          {sheetsQuery.data && sheetsQuery.data.spreadsheets.length === 0 && (
            <p className="text-sm text-muted-foreground">Таблицы не найдены.</p>
          )}
          {sheetsQuery.data && sheetsQuery.data.spreadsheets.length > 0 && (
            <ul className="divide-y">
              {sheetsQuery.data.spreadsheets.map((sheet) => (
                <li key={sheet.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{sheet.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Изменено: {formatDateTime(sheet.modifiedTime)}
                      {sheet.owner ? ` · ${sheet.owner}` : ""}
                    </div>
                  </div>
                  {sheet.webViewLink && (
                    <a
                      href={sheet.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary hover:underline shrink-0 flex items-center gap-1"
                    >
                      Открыть
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function ProfileSection() {
  const { settings, setSettings } = useSettings();
  const { toast } = useToast();
  const [name, setName] = useState(settings.userName);

  useEffect(() => {
    setName(settings.userName);
  }, [settings.userName]);

  const save = () => {
    setSettings({ userName: name.trim() });
    toast({ title: "Профиль сохранён" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Профиль</CardTitle>
        <CardDescription>
          Имя отображается в боковой панели.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 max-w-sm">
          <Label htmlFor="user-name">Имя</Label>
          <Input
            id="user-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например: Иван Иванов"
          />
        </div>
        <Button onClick={save} disabled={name === settings.userName}>
          Сохранить
        </Button>
      </CardContent>
    </Card>
  );
}

function AppearanceSection() {
  const { settings, setSettings } = useSettings();

  const themeOptions: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Светлая", icon: Sun },
    { value: "dark", label: "Тёмная", icon: Moon },
    { value: "system", label: "Как в системе", icon: Monitor },
  ];
  const densityOptions: { value: Density; label: string; hint: string }[] = [
    { value: "comfortable", label: "Просторная", hint: "Стандартный размер" },
    { value: "compact", label: "Компактная", hint: "Больше помещается" },
  ];
  const timeOptions: { value: TimeFormat; label: string; hint: string }[] = [
    { value: "24h", label: "24 часа", hint: "14:30" },
    { value: "12h", label: "12 часов", hint: "2:30 PM" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Внешний вид</CardTitle>
        <CardDescription>
          Тема, плотность и формат времени в интерфейсе.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Тема</Label>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const active = settings.theme === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSettings({ theme: opt.value })}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Плотность интерфейса</Label>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {densityOptions.map((opt) => {
              const active = settings.density === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSettings({ density: opt.value })}
                  className={`flex flex-col items-start gap-1 p-4 rounded-lg border-2 transition-colors text-left ${
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <span className="text-sm font-medium">{opt.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {opt.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Формат времени</Label>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {timeOptions.map((opt) => {
              const active = settings.timeFormat === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSettings({ timeFormat: opt.value })}
                  className={`flex flex-col items-start gap-1 p-4 rounded-lg border-2 transition-colors text-left ${
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <span className="text-sm font-medium">{opt.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {opt.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SchedulePreferencesSection() {
  const { settings, setSettings } = useSettings();
  const { toast } = useToast();
  const [dayStart, setDayStart] = useState(settings.dayStart);
  const [dayEnd, setDayEnd] = useState(settings.dayEnd);
  const [duration, setDuration] = useState(
    String(settings.defaultLessonDurationMinutes),
  );
  const [defaultLocation, setDefaultLocation] = useState(
    settings.defaultLessonLocation,
  );

  useEffect(() => {
    setDayStart(settings.dayStart);
    setDayEnd(settings.dayEnd);
    setDuration(String(settings.defaultLessonDurationMinutes));
    setDefaultLocation(settings.defaultLessonLocation);
  }, [
    settings.dayStart,
    settings.dayEnd,
    settings.defaultLessonDurationMinutes,
    settings.defaultLessonLocation,
  ]);

  const save = () => {
    const dur = parseInt(duration, 10);
    if (!Number.isFinite(dur) || dur <= 0 || dur > 600) {
      toast({
        title: "Длительность пары должна быть от 1 до 600 минут",
        variant: "destructive",
      });
      return;
    }
    if (dayEnd <= dayStart) {
      toast({
        title: "Конец дня должен быть позже начала",
        variant: "destructive",
      });
      return;
    }
    setSettings({
      dayStart,
      dayEnd,
      defaultLessonDurationMinutes: dur,
      defaultLessonLocation: defaultLocation.trim(),
    });
    toast({ title: "Настройки расписания сохранены" });
  };

  const dirty =
    dayStart !== settings.dayStart ||
    dayEnd !== settings.dayEnd ||
    duration !== String(settings.defaultLessonDurationMinutes) ||
    defaultLocation.trim() !== settings.defaultLessonLocation;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Расписание</CardTitle>
        <CardDescription>
          Влияет на свободные окна на дашборде, неделю и быстрое создание пар.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="day-start">Начало учебного дня</Label>
            <Input
              id="day-start"
              type="time"
              value={dayStart}
              onChange={(e) => setDayStart(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="day-end">Конец учебного дня</Label>
            <Input
              id="day-end"
              type="time"
              value={dayEnd}
              onChange={(e) => setDayEnd(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2 max-w-md">
          <Label>День начала недели</Label>
          <Select
            value={String(settings.weekStartsOn)}
            onValueChange={(v) =>
              setSettings({ weekStartsOn: v === "0" ? 0 : 1 })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Понедельник</SelectItem>
              <SelectItem value="0">Воскресенье</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 max-w-md">
          <Label htmlFor="lesson-dur">
            Длительность пары по умолчанию (минут)
          </Label>
          <Input
            id="lesson-dur"
            type="number"
            min={1}
            max={600}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Используется при создании новой пары — конец заполняется
            автоматически.
          </p>
        </div>

        <div className="space-y-2 max-w-md">
          <Label htmlFor="default-location">Аудитория по умолчанию</Label>
          <Input
            id="default-location"
            value={defaultLocation}
            onChange={(e) => setDefaultLocation(e.target.value)}
            placeholder="Например: 305 ауд."
          />
          <p className="text-xs text-muted-foreground">
            Подставляется в поле «Место» при создании новой пары.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 max-w-md py-2">
          <div className="space-y-0.5">
            <Label htmlFor="hide-weekends">Скрывать выходные</Label>
            <p className="text-xs text-muted-foreground">
              Не показывать субботу и воскресенье в неделе и месяце.
            </p>
          </div>
          <Switch
            id="hide-weekends"
            checked={settings.hideWeekends}
            onCheckedChange={(v) => setSettings({ hideWeekends: v })}
          />
        </div>

        <Button onClick={save} disabled={!dirty}>
          Сохранить
        </Button>
      </CardContent>
    </Card>
  );
}

function ResetSection() {
  const { reset } = useSettings();
  const { toast } = useToast();

  const handleReset = () => {
    if (
      !confirm(
        "Сбросить все настройки до значений по умолчанию? Данные (пары, задачи и т.п.) не будут затронуты.",
      )
    )
      return;
    reset();
    toast({ title: "Настройки сброшены" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Сброс настроек</CardTitle>
        <CardDescription>
          Вернуть все настройки интерфейса к значениям по умолчанию. Не удаляет
          твои данные.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Сбросить настройки
        </Button>
      </CardContent>
    </Card>
  );
}

function ReminderSection() {
  const { settings, setSettings } = useSettings();
  const { toast } = useToast();
  const [hours, setHours] = useState(String(settings.reminderHours));

  useEffect(() => {
    setHours(String(settings.reminderHours));
  }, [settings.reminderHours]);

  const save = () => {
    const n = parseInt(hours, 10);
    if (!Number.isFinite(n) || n < 0 || n > 720) {
      toast({
        title: "Введите число от 0 до 720",
        variant: "destructive",
      });
      return;
    }
    setSettings({ reminderHours: n });
    toast({ title: "Сохранено" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Напоминания</CardTitle>
        <CardDescription>
          За сколько часов до дедлайна выделять задачи, долги и тесты как
          срочные.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 max-w-xs">
          <Label htmlFor="reminder-hours">Порог (часов)</Label>
          <Input
            id="reminder-hours"
            type="number"
            min={0}
            max={720}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Например, 24 = выделять всё с дедлайном в ближайшие сутки.
          </p>
        </div>
        <Button onClick={save} disabled={hours === String(settings.reminderHours)}>
          Сохранить
        </Button>
      </CardContent>
    </Card>
  );
}

function DataManagementSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | "export" | "import" | "clear">(null);

  const handleExport = async () => {
    setBusy("export");
    try {
      const res = await fetch(apiUrl("api/admin/export"));
      if (!res.ok) throw new Error("export failed");
      const json = await res.json();
      const blob = new Blob([JSON.stringify(json, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `studenthub-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Экспорт готов" });
    } catch {
      toast({ title: "Не удалось выгрузить данные", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const handleImportFile = async (file: File) => {
    if (
      !confirm(
        "Импорт ЗАМЕНИТ все текущие данные. Продолжить?",
      )
    )
      return;
    setBusy("import");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const payload =
        parsed && typeof parsed === "object" && "data" in parsed
          ? parsed
          : { data: parsed };
      const res = await fetch(apiUrl("api/admin/import"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, replace: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "import failed");
      }
      await queryClient.invalidateQueries();
      toast({ title: "Данные импортированы" });
    } catch (e) {
      toast({
        title: "Не удалось импортировать",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClear = async () => {
    const confirmation = prompt(
      'Это удалит ВСЕ предметы, пары, задачи, долги, оценки, тесты и заметки. Введите "УДАЛИТЬ" для подтверждения.',
    );
    if (confirmation !== "УДАЛИТЬ") {
      toast({ title: "Очистка отменена" });
      return;
    }
    setBusy("clear");
    try {
      const res = await fetch(apiUrl("api/admin/data"), { method: "DELETE" });
      if (!res.ok) throw new Error("clear failed");
      await queryClient.invalidateQueries();
      toast({ title: "Все данные удалены" });
    } catch {
      toast({ title: "Не удалось очистить", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Данные</CardTitle>
        <CardDescription>
          Резервное копирование, импорт и полная очистка.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={busy !== null}
          >
            <Download className="w-4 h-4 mr-2" />
            {busy === "export" ? "Экспорт..." : "Экспорт в JSON"}
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy !== null}
          >
            <Upload className="w-4 h-4 mr-2" />
            {busy === "import" ? "Импорт..." : "Импорт из JSON"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
            }}
          />
          <Button
            variant="destructive"
            onClick={handleClear}
            disabled={busy !== null}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {busy === "clear" ? "Удаление..." : "Очистить все данные"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Импорт полностью заменит текущие данные. Сделай экспорт перед этим.
        </p>
      </CardContent>
    </Card>
  );
}

export function SettingsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-3xl font-bold">Настройки</h2>

      <ProfileSection />
      <AppearanceSection />
      <SchedulePreferencesSection />
      <ReminderSection />
      <GoogleSection />
      <DataManagementSection />
      <ResetSection />
    </div>
  );
}
