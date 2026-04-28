import {
  useGetWeek,
  useCreateLesson,
  useUpdateLesson,
  useDeleteLesson,
  useListLessons,
  getGetWeekQueryKey,
  getListLessonsQueryKey,
  getGetDashboardTodayQueryKey,
  type Lesson,
  type LessonInput,
} from "@workspace/api-client-react";
import { useState } from "react";
import { format, addWeeks, subWeeks, startOfWeek } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SubjectSelect } from "@/components/subject-select";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isoToDatetimeLocal, datetimeLocalToIso } from "@/lib/date-input";

interface LessonFormState {
  title: string;
  subjectId: number | null;
  startsAt: string;
  endsAt: string;
  location: string;
  teacher: string;
  description: string;
}

function emptyForm(defaultDate?: string): LessonFormState {
  return {
    title: "",
    subjectId: null,
    startsAt: defaultDate ?? "",
    endsAt: "",
    location: "",
    teacher: "",
    description: "",
  };
}

function lessonToForm(l: Lesson): LessonFormState {
  return {
    title: l.title,
    subjectId: l.subjectId ?? null,
    startsAt: isoToDatetimeLocal(l.startsAt),
    endsAt: isoToDatetimeLocal(l.endsAt),
    location: l.location ?? "",
    teacher: l.teacher ?? "",
    description: l.description ?? "",
  };
}

function formToInput(f: LessonFormState): LessonInput {
  return {
    title: f.title.trim(),
    subjectId: f.subjectId,
    startsAt: datetimeLocalToIso(f.startsAt) ?? new Date().toISOString(),
    endsAt: datetimeLocalToIso(f.endsAt) ?? new Date().toISOString(),
    location: f.location.trim() || null,
    teacher: f.teacher.trim() || null,
    description: f.description.trim() || null,
  };
}

interface LessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson?: Lesson | null;
  defaultDate?: string;
  onSaved: () => void;
}

function LessonDialog({
  open,
  onOpenChange,
  lesson,
  defaultDate,
  onSaved,
}: LessonDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<LessonFormState>(emptyForm(defaultDate));
  const create = useCreateLesson();
  const update = useUpdateLesson();
  const isEdit = lesson != null;

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setForm(lesson ? lessonToForm(lesson) : emptyForm(defaultDate));
    }
    onOpenChange(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast({ title: "Введите название", variant: "destructive" });
      return;
    }
    if (!form.startsAt || !form.endsAt) {
      toast({ title: "Укажите время начала и конца", variant: "destructive" });
      return;
    }
    const startMs = new Date(form.startsAt).getTime();
    const endMs = new Date(form.endsAt).getTime();
    if (endMs <= startMs) {
      toast({
        title: "Время окончания должно быть после начала",
        variant: "destructive",
      });
      return;
    }
    const input = formToInput(form);
    const onSuccess = () => {
      toast({ title: isEdit ? "Пара обновлена" : "Пара добавлена" });
      onSaved();
      onOpenChange(false);
    };
    const onError = () =>
      toast({ title: "Не удалось сохранить", variant: "destructive" });
    if (isEdit && lesson) {
      update.mutate({ id: lesson.id, data: input }, { onSuccess, onError });
    } else {
      create.mutate({ data: input }, { onSuccess, onError });
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Редактировать пару" : "Новая пара"}
            </DialogTitle>
            <DialogDescription>
              Обязательны название, время начала и конца.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="lesson-title">Название *</Label>
              <Input
                id="lesson-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Например: Лекция по матану"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Предмет</Label>
              <SubjectSelect
                value={form.subjectId}
                onChange={(v) => setForm({ ...form, subjectId: v })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lesson-start">Начало *</Label>
                <Input
                  id="lesson-start"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) =>
                    setForm({ ...form, startsAt: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lesson-end">Конец *</Label>
                <Input
                  id="lesson-end"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) =>
                    setForm({ ...form, endsAt: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-loc">Место</Label>
              <Input
                id="lesson-loc"
                value={form.location}
                onChange={(e) =>
                  setForm({ ...form, location: e.target.value })
                }
                placeholder="Например: ауд. 305"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-teacher">Преподаватель</Label>
              <Input
                id="lesson-teacher"
                value={form.teacher}
                onChange={(e) => setForm({ ...form, teacher: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-desc">Описание</Label>
              <Textarea
                id="lesson-desc"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function WeekPage() {
  const [weekStart, setWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteLesson = useDeleteLesson();

  const { data, isLoading } = useGetWeek({
    weekStart: weekStart.toISOString().split("T")[0],
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetWeekQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListLessonsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardTodayQueryKey() });
  };

  const openCreate = (dayDate?: string) => {
    setEditing(null);
    if (dayDate) {
      const d = new Date(dayDate);
      d.setHours(9, 0, 0, 0);
      setDefaultDate(isoToDatetimeLocal(d.toISOString()));
    } else {
      setDefaultDate(undefined);
    }
    setDialogOpen(true);
  };

  const openEdit = (lesson: Lesson) => {
    setEditing(lesson);
    setDefaultDate(undefined);
    setDialogOpen(true);
  };

  const handleDelete = (lesson: Lesson) => {
    if (!confirm(`Удалить пару «${lesson.title}»?`)) return;
    deleteLesson.mutate(
      { id: lesson.id },
      {
        onSuccess: () => {
          toast({ title: "Пара удалена" });
          invalidate();
        },
        onError: () =>
          toast({ title: "Не удалось удалить", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-3xl font-bold">Неделя</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(subWeeks(weekStart, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
            }
          >
            Эта неделя
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button onClick={() => openCreate()}>
            <Plus className="w-4 h-4 mr-2" />
            Новая пара
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : data ? (
        <div>
          <p className="text-muted-foreground mb-4 capitalize">
            {format(new Date(data.weekStart), "d MMMM", { locale: ru })} –{" "}
            {format(new Date(data.weekEnd), "d MMMM", { locale: ru })}
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {data.days.map((day) => (
              <div key={day.date} className="border rounded-lg p-3 bg-card">
                <div className="font-medium text-center mb-3 pb-2 border-b">
                  <div className="capitalize text-sm">
                    {format(new Date(day.date), "EEEE", { locale: ru })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(day.date), "d MMM", { locale: ru })}
                  </div>
                </div>
                <div className="space-y-2">
                  {day.lessons.map((l) => (
                    <div
                      key={l.id}
                      className="text-xs p-2 bg-secondary rounded group relative"
                      style={{
                        borderLeft: `3px solid ${l.subjectColor || "var(--primary)"}`,
                      }}
                    >
                      <div className="font-semibold pr-12">{l.title}</div>
                      <div className="text-muted-foreground">
                        {format(new Date(l.startsAt), "HH:mm", { locale: ru })}{" "}
                        – {format(new Date(l.endsAt), "HH:mm", { locale: ru })}
                      </div>
                      {l.location && (
                        <div className="text-muted-foreground">
                          {l.location}
                        </div>
                      )}
                      {l.subjectName && (
                        <div className="text-muted-foreground">
                          {l.subjectName}
                        </div>
                      )}
                      <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(l)}
                          className="p-1 hover:bg-background rounded"
                          aria-label="Редактировать"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(l)}
                          className="p-1 hover:bg-background rounded"
                          aria-label="Удалить"
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {day.tasks.map((t) => (
                    <div
                      key={t.id}
                      className="text-xs p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded"
                    >
                      [Задача] {t.title}
                    </div>
                  ))}
                  <button
                    onClick={() => openCreate(day.date)}
                    className="w-full text-xs p-2 border border-dashed rounded text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
                  >
                    + добавить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <LessonDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        lesson={editing}
        defaultDate={defaultDate}
        onSaved={invalidate}
      />
    </div>
  );
}
