import {
  useListTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  getListTasksQueryKey,
  getGetDashboardTodayQueryKey,
  type Task,
  type TaskInput,
} from "@workspace/api-client-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubjectSelect } from "@/components/subject-select";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isoToDatetimeLocal, datetimeLocalToIso } from "@/lib/date-input";
import { isUrgent } from "@/lib/free-slots";
import { useSettings } from "@/contexts/settings";

const STATUS_OPTIONS = [
  { value: "todo", label: "К выполнению" },
  { value: "in_progress", label: "В работе" },
  { value: "done", label: "Готово" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Низкий" },
  { value: "medium", label: "Средний" },
  { value: "high", label: "Высокий" },
];

interface TaskFormState {
  title: string;
  description: string;
  subjectId: number | null;
  status: string;
  priority: string;
  dueDate: string;
  estimatedMinutes: string;
}

function emptyForm(): TaskFormState {
  return {
    title: "",
    description: "",
    subjectId: null,
    status: "todo",
    priority: "medium",
    dueDate: "",
    estimatedMinutes: "",
  };
}

function taskToForm(task: Task): TaskFormState {
  return {
    title: task.title,
    description: task.description ?? "",
    subjectId: task.subjectId ?? null,
    status: task.status,
    priority: task.priority,
    dueDate: isoToDatetimeLocal(task.dueDate),
    estimatedMinutes:
      task.estimatedMinutes != null ? String(task.estimatedMinutes) : "",
  };
}

function formToInput(form: TaskFormState): TaskInput {
  const minutes = form.estimatedMinutes
    ? parseInt(form.estimatedMinutes, 10)
    : null;
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    subjectId: form.subjectId,
    status: form.status,
    priority: form.priority,
    dueDate: datetimeLocalToIso(form.dueDate),
    estimatedMinutes: Number.isNaN(minutes as number) ? null : minutes,
  };
}

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  onSaved: () => void;
}

function TaskDialog({ open, onOpenChange, task, onSaved }: TaskDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<TaskFormState>(emptyForm());
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const isEdit = task != null;

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setForm(task ? taskToForm(task) : emptyForm());
    }
    onOpenChange(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = formToInput(form);
    if (!input.title) {
      toast({
        title: "Введите название",
        variant: "destructive",
      });
      return;
    }
    const onSuccess = () => {
      toast({ title: isEdit ? "Задача обновлена" : "Задача создана" });
      onSaved();
      onOpenChange(false);
    };
    const onError = () => {
      toast({ title: "Не удалось сохранить", variant: "destructive" });
    };
    if (isEdit && task) {
      updateTask.mutate({ id: task.id, data: input }, { onSuccess, onError });
    } else {
      createTask.mutate({ data: input }, { onSuccess, onError });
    }
  };

  const isPending = createTask.isPending || updateTask.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Редактировать задачу" : "Новая задача"}
            </DialogTitle>
            <DialogDescription>
              Заполните детали задачи. Обязательно — только название.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Название *</Label>
              <Input
                id="task-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Например: Решить задачи по матану"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-desc">Описание</Label>
              <Textarea
                id="task-desc"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
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
                <Label>Статус</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Приоритет</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task-due">Срок</Label>
                <Input
                  id="task-due"
                  type="datetime-local"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-mins">Оценка времени, мин</Label>
                <Input
                  id="task-mins"
                  type="number"
                  min="0"
                  value={form.estimatedMinutes}
                  onChange={(e) =>
                    setForm({ ...form, estimatedMinutes: e.target.value })
                  }
                />
              </div>
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

export function TasksPage() {
  const [filter, setFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { data, isLoading } = useListTasks({});
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { settings } = useSettings();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardTodayQueryKey() });
  };

  const handleToggle = (id: number, title: string, currentStatus: string) => {
    updateTask.mutate(
      {
        id,
        data: { title, status: currentStatus === "done" ? "todo" : "done" },
      },
      { onSuccess: invalidate },
    );
  };

  const handleDelete = (task: Task) => {
    if (!confirm(`Удалить задачу «${task.title}»?`)) return;
    deleteTask.mutate(
      { id: task.id },
      {
        onSuccess: () => {
          toast({ title: "Задача удалена" });
          invalidate();
        },
        onError: () =>
          toast({ title: "Не удалось удалить", variant: "destructive" }),
      },
    );
  };

  const openCreate = () => {
    setEditingTask(null);
    setDialogOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Задачи</h2>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Новая задача
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "todo", "in_progress", "done"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {f === "all"
              ? "Все"
              : f === "todo"
                ? "К выполнению"
                : f === "in_progress"
                  ? "В работе"
                  : "Готово"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-3">
          {data
            .filter((t) => filter === "all" || t.status === filter)
            .map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-4 p-4 border rounded-lg bg-card group"
              >
                <Checkbox
                  checked={task.status === "done"}
                  onCheckedChange={() =>
                    handleToggle(task.id, task.title, task.status)
                  }
                />
                <div className="flex-1 min-w-0">
                  <div
                    className={`font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}
                  >
                    {task.title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                    {task.subjectName && (
                      <span className="flex items-center gap-1">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor:
                              task.subjectColor || "var(--primary)",
                          }}
                        />
                        {task.subjectName}
                      </span>
                    )}
                    <span>
                      {task.priority === "high"
                        ? "Высокий"
                        : task.priority === "low"
                          ? "Низкий"
                          : "Средний"}{" "}
                      приоритет
                    </span>
                    {task.estimatedMinutes != null && (
                      <span>~{task.estimatedMinutes} мин</span>
                    )}
                  </div>
                </div>
                {task.dueDate && (
                  <div className="text-sm hidden sm:block text-right">
                    <div
                      className={
                        task.status !== "done" &&
                        isUrgent(task.dueDate, settings.reminderHours)
                          ? "text-destructive font-medium"
                          : "text-muted-foreground"
                      }
                    >
                      {format(new Date(task.dueDate), "d MMM HH:mm", {
                        locale: ru,
                      })}
                    </div>
                    {task.status !== "done" &&
                      isUrgent(task.dueDate, settings.reminderHours) && (
                        <div className="text-[10px] text-destructive uppercase tracking-wide">
                          скоро
                        </div>
                      )}
                  </div>
                )}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(task)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(task)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="text-center py-16 border rounded-lg bg-card/50">
          <p className="text-muted-foreground mb-4">Задач пока нет</p>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Создать первую
          </Button>
        </div>
      )}

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editingTask}
        onSaved={invalidate}
      />
    </div>
  );
}
