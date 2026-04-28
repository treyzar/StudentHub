import {
  useListTests,
  useCreateTest,
  useUpdateTest,
  useDeleteTest,
  getListTestsQueryKey,
  getGetDashboardTodayQueryKey,
  type Test,
  type TestInput,
} from "@workspace/api-client-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Запланирован" },
  { value: "in_progress", label: "Идёт" },
  { value: "passed", label: "Сдан" },
  { value: "failed", label: "Не сдан" },
];

const IMPORTANCE_OPTIONS = [
  { value: "low", label: "Низкая" },
  { value: "medium", label: "Средняя" },
  { value: "high", label: "Высокая" },
];

interface TestFormState {
  title: string;
  subjectId: number | null;
  scheduledAt: string;
  deadline: string;
  status: string;
  result: string;
  link: string;
  importance: string;
  needsPreparation: boolean;
  preparationPlan: string;
}

function emptyForm(): TestFormState {
  return {
    title: "",
    subjectId: null,
    scheduledAt: "",
    deadline: "",
    status: "scheduled",
    result: "",
    link: "",
    importance: "medium",
    needsPreparation: true,
    preparationPlan: "",
  };
}

function testToForm(t: Test): TestFormState {
  return {
    title: t.title,
    subjectId: t.subjectId ?? null,
    scheduledAt: isoToDatetimeLocal(t.scheduledAt),
    deadline: isoToDatetimeLocal(t.deadline),
    status: t.status,
    result: t.result ?? "",
    link: t.link ?? "",
    importance: t.importance,
    needsPreparation: t.needsPreparation,
    preparationPlan: t.preparationPlan ?? "",
  };
}

function formToInput(f: TestFormState): TestInput {
  return {
    title: f.title.trim(),
    subjectId: f.subjectId,
    scheduledAt: datetimeLocalToIso(f.scheduledAt) ?? new Date().toISOString(),
    deadline: datetimeLocalToIso(f.deadline),
    status: f.status,
    result: f.result.trim() || null,
    link: f.link.trim() || null,
    importance: f.importance,
    needsPreparation: f.needsPreparation,
    preparationPlan: f.preparationPlan.trim() || null,
  };
}

interface TestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  test?: Test | null;
  onSaved: () => void;
}

function TestDialog({ open, onOpenChange, test, onSaved }: TestDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<TestFormState>(emptyForm());
  const create = useCreateTest();
  const update = useUpdateTest();
  const isEdit = test != null;

  const handleOpenChange = (next: boolean) => {
    if (next) setForm(test ? testToForm(test) : emptyForm());
    onOpenChange(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast({ title: "Введите название", variant: "destructive" });
      return;
    }
    if (!form.scheduledAt) {
      toast({ title: "Укажите дату теста", variant: "destructive" });
      return;
    }
    const input = formToInput(form);
    const onSuccess = () => {
      toast({ title: isEdit ? "Тест обновлён" : "Тест создан" });
      onSaved();
      onOpenChange(false);
    };
    const onError = () =>
      toast({ title: "Не удалось сохранить", variant: "destructive" });
    if (isEdit && test) {
      update.mutate({ id: test.id, data: input }, { onSuccess, onError });
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
              {isEdit ? "Редактировать тест" : "Новый тест"}
            </DialogTitle>
            <DialogDescription>
              Обязательные поля — название и дата.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-title">Название *</Label>
              <Input
                id="test-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Например: Контрольная по физике"
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
                <Label htmlFor="test-when">Когда *</Label>
                <Input
                  id="test-when"
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) =>
                    setForm({ ...form, scheduledAt: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-deadline">Дедлайн</Label>
                <Input
                  id="test-deadline"
                  type="datetime-local"
                  value={form.deadline}
                  onChange={(e) =>
                    setForm({ ...form, deadline: e.target.value })
                  }
                />
              </div>
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
                <Label>Важность</Label>
                <Select
                  value={form.importance}
                  onValueChange={(v) => setForm({ ...form, importance: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMPORTANCE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="test-prep"
                checked={form.needsPreparation}
                onCheckedChange={(v) =>
                  setForm({ ...form, needsPreparation: v === true })
                }
              />
              <Label htmlFor="test-prep" className="cursor-pointer">
                Требуется подготовка
              </Label>
            </div>
            {form.needsPreparation && (
              <div className="space-y-2">
                <Label htmlFor="test-plan">План подготовки</Label>
                <Textarea
                  id="test-plan"
                  value={form.preparationPlan}
                  onChange={(e) =>
                    setForm({ ...form, preparationPlan: e.target.value })
                  }
                  rows={3}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="test-link">Ссылка</Label>
              <Input
                id="test-link"
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-result">Результат</Label>
              <Input
                id="test-result"
                value={form.result}
                onChange={(e) => setForm({ ...form, result: e.target.value })}
                placeholder="Например: 85/100"
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

export function TestsPage() {
  const { data, isLoading } = useListTests({});
  const deleteTest = useDeleteTest();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Test | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListTestsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardTodayQueryKey() });
  };

  const handleDelete = (test: Test) => {
    if (!confirm(`Удалить тест «${test.title}»?`)) return;
    deleteTest.mutate(
      { id: test.id },
      {
        onSuccess: () => {
          toast({ title: "Тест удалён" });
          invalidate();
        },
        onError: () =>
          toast({ title: "Не удалось удалить", variant: "destructive" }),
      },
    );
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (test: Test) => {
    setEditing(test);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Тесты</h2>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Новый тест
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32" />
      ) : data && data.length > 0 ? (
        <div className="grid gap-4">
          {data.map((test) => (
            <div
              key={test.id}
              className="p-4 border rounded-lg bg-card border-l-4 group"
              style={{
                borderLeftColor: test.subjectColor || "var(--primary)",
              }}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{test.title}</h3>
                  {test.subjectName && (
                    <p className="text-sm text-muted-foreground">
                      {test.subjectName}
                    </p>
                  )}
                  {test.preparationPlan && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      {test.preparationPlan}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="font-medium">
                      {format(new Date(test.scheduledAt), "d MMM HH:mm", {
                        locale: ru,
                      })}
                    </div>
                    <span className="text-xs px-2 py-1 bg-secondary rounded mt-1 inline-block">
                      {STATUS_OPTIONS.find((s) => s.value === test.status)
                        ?.label ?? test.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(test)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(test)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border rounded-lg bg-card/50">
          <p className="text-muted-foreground mb-4">Тестов пока нет</p>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Добавить тест
          </Button>
        </div>
      )}

      <TestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        test={editing}
        onSaved={invalidate}
      />
    </div>
  );
}
