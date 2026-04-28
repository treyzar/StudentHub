import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { Calendar, FileSpreadsheet, ExternalLink, LogOut } from "lucide-react";

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
          </CardDescription>
        </CardHeader>
        <CardContent>
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

export function SettingsPage() {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false,
  );
  const toggleDark = (checked: boolean) => {
    setIsDark(checked);
    document.documentElement.classList.toggle("dark", checked);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-3xl font-bold">Настройки</h2>

      <Card>
        <CardHeader>
          <CardTitle>Внешний вид</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <Label htmlFor="dark-mode" className="text-base">
            Тёмная тема
          </Label>
          <Switch id="dark-mode" checked={isDark} onCheckedChange={toggleDark} />
        </CardContent>
      </Card>

      <GoogleSection />
    </div>
  );
}
