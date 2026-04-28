import {
  useListSubjects,
  useCreateSubject,
  useUpdateSubject,
  useDeleteSubject,
  getListSubjectsQueryKey,
  type SubjectWithStats,
  type SubjectInput,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import { BookOpen, Plus, Pencil, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
];

interface SubjectFormState {
  name: string;
  teacher: string;
  color: string;
  description: string;
  archived: boolean;
}

function emptyForm(): SubjectFormState {
  return {
    name: "",
    teacher: "",
    color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
    description: "",
    archived: false,
  };
}

function subjectToForm(s: SubjectWithStats): SubjectFormState {
  return {
    name: s.name,
    teacher: s.teacher ?? "",
    color: s.color,
    description: s.description ?? "",
    archived: s.archived,
  };
}

function formToInput(f: SubjectFormState): SubjectInput {
  return {
    name: f.name.trim(),
    teacher: f.teacher.trim() || null,
    color: f.color,
    description: f.description.trim() || null,
    archived: f.archived,
  };
}

interface SubjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject?: SubjectWithStats | null;
  onSaved: () => void;
}

function SubjectDialog({
  open,
  onOpenChange,
  subject,
  onSaved,
}: SubjectDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<SubjectFormState>(emptyForm());
  const create = useCreateSubject();
  const update = useUpdateSubject();
  const isEdit = subject != null;

  const handleOpenChange = (next: boolean) => {
    if (next) setForm(subject ? subjectToForm(subject) : emptyForm());
    onOpenChange(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = formToInput(form);
    if (!input.name) {
      toast({ title: "Введите название", variant: "destructive" });
      return;
    }
    const onSuccess = () => {
      toast({ title: isEdit ? "Предмет обновлён" : "Предмет создан" });
      onSaved();
      onOpenChange(false);
    };
    const onError = () =>
      toast({ title: "Не удалось сохранить", variant: "destructive" });
    if (isEdit && subject) {
      update.mutate({ id: subject.id, data: input }, { onSuccess, onError });
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
              {isEdit ? "Редактировать предмет" : "Новый предмет"}
            </DialogTitle>
            <DialogDescription>
              Заполните детали. Обязательно — название и цвет.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subj-name">Название *</Label>
              <Input
                id="subj-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Например: Математический анализ"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subj-teacher">Преподаватель</Label>
              <Input
                id="subj-teacher"
                value={form.teacher}
                onChange={(e) =>
                  setForm({ ...form, teacher: e.target.value })
                }
                placeholder="Иванов И.И."
              />
            </div>
            <div className="space-y-2">
              <Label>Цвет *</Label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      form.color === c
                        ? "ring-2 ring-offset-2 ring-foreground scale-110"
                        : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Цвет ${c}`}
                  />
                ))}
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) =>
                    setForm({ ...form, color: e.target.value })
                  }
                  className="w-8 h-8 rounded border cursor-pointer"
                  aria-label="Свой цвет"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subj-desc">Описание</Label>
              <Textarea
                id="subj-desc"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
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

export function SubjectsPage() {
  const { data, isLoading } = useListSubjects();
  const deleteSubject = useDeleteSubject();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectWithStats | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (subject: SubjectWithStats) => {
    setEditing(subject);
    setDialogOpen(true);
  };

  const handleDelete = (subject: SubjectWithStats) => {
    if (
      !confirm(
        `Удалить предмет «${subject.name}»? Связанные пары, задачи, долги и оценки потеряют привязку.`,
      )
    )
      return;
    deleteSubject.mutate(
      { id: subject.id },
      {
        onSuccess: () => {
          toast({ title: "Предмет удалён" });
          invalidate();
        },
        onError: () =>
          toast({ title: "Не удалось удалить", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Предметы</h2>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Новый предмет
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((subject) => (
            <Card
              key={subject.id}
              className="hover:shadow-md transition-shadow overflow-hidden border-t-4 group relative"
              style={{ borderTopColor: subject.color }}
            >
              <Link href={`/subjects/${subject.id}`}>
                <CardHeader className="pb-2 cursor-pointer">
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{subject.name}</span>
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="cursor-pointer">
                  <p className="text-sm text-muted-foreground mb-4 truncate">
                    {subject.teacher || "Преподаватель не указан"}
                  </p>

                  <div className="flex gap-4 text-sm">
                    {subject.averageGrade !== null && (
                      <div>
                        <div className="font-semibold">
                          {subject.averageGrade.toFixed(1)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Ср. балл
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-destructive">
                        {subject.debtCount}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Долгов
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold">{subject.taskCount}</div>
                      <div className="text-xs text-muted-foreground">Задач</div>
                    </div>
                  </div>
                </CardContent>
              </Link>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openEdit(subject);
                  }}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDelete(subject);
                  }}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border rounded-lg bg-card/50">
          <p className="text-muted-foreground mb-4">Предметов пока нет</p>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Создать первый
          </Button>
        </div>
      )}

      <SubjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subject={editing}
        onSaved={invalidate}
      />
    </div>
  );
}
