import {
  useListDebts,
  useCreateDebt,
  useUpdateDebt,
  useDeleteDebt,
  getListDebtsQueryKey,
  getGetDashboardTodayQueryKey,
  type Debt,
  type DebtInput,
} from "@workspace/api-client-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
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
import { AlertCircle, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isoToDatetimeLocal, datetimeLocalToIso } from "@/lib/date-input";

const STATUS_OPTIONS = [
  { value: "open", label: "Открыт" },
  { value: "in_progress", label: "В работе" },
  { value: "closed", label: "Закрыт" },
];

const IMPORTANCE_OPTIONS = [
  { value: "low", label: "Низкая" },
  { value: "medium", label: "Средняя" },
  { value: "high", label: "Высокая" },
];

interface DebtFormState {
  title: string;
  description: string;
  subjectId: number | null;
  deadline: string;
  status: string;
  importance: string;
  link: string;
  comment: string;
}

function emptyForm(): DebtFormState {
  return {
    title: "",
    description: "",
    subjectId: null,
    deadline: "",
    status: "open",
    importance: "medium",
    link: "",
    comment: "",
  };
}

function debtToForm(d: Debt): DebtFormState {
  return {
    title: d.title,
    description: d.description ?? "",
    subjectId: d.subjectId ?? null,
    deadline: isoToDatetimeLocal(d.deadline),
    status: d.status,
    importance: d.importance,
    link: d.link ?? "",
    comment: d.comment ?? "",
  };
}

function formToInput(f: DebtFormState): DebtInput {
  return {
    title: f.title.trim(),
    description: f.description.trim() || null,
    subjectId: f.subjectId,
    deadline: datetimeLocalToIso(f.deadline),
    status: f.status,
    importance: f.importance,
    link: f.link.trim() || null,
    comment: f.comment.trim() || null,
  };
}

interface DebtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt?: Debt | null;
  onSaved: () => void;
}

function DebtDialog({ open, onOpenChange, debt, onSaved }: DebtDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<DebtFormState>(emptyForm());
  const create = useCreateDebt();
  const update = useUpdateDebt();
  const isEdit = debt != null;

  const handleOpenChange = (next: boolean) => {
    if (next) setForm(debt ? debtToForm(debt) : emptyForm());
    onOpenChange(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = formToInput(form);
    if (!input.title) {
      toast({ title: "Введите название", variant: "destructive" });
      return;
    }
    const onSuccess = () => {
      toast({ title: isEdit ? "Долг обновлён" : "Долг создан" });
      onSaved();
      onOpenChange(false);
    };
    const onError = () =>
      toast({ title: "Не удалось сохранить", variant: "destructive" });
    if (isEdit && debt) {
      update.mutate({ id: debt.id, data: input }, { onSuccess, onError });
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
              {isEdit ? "Редактировать долг" : "Новый долг"}
            </DialogTitle>
            <DialogDescription>
              Заполните информацию. Обязательно — только название.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="debt-title">Название *</Label>
              <Input
                id="debt-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Например: Сдать лабораторную №3"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="debt-desc">Описание</Label>
              <Textarea
                id="debt-desc"
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
            <div className="space-y-2">
              <Label htmlFor="debt-deadline">Дедлайн</Label>
              <Input
                id="debt-deadline"
                type="datetime-local"
                value={form.deadline}
                onChange={(e) =>
                  setForm({ ...form, deadline: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="debt-link">Ссылка</Label>
              <Input
                id="debt-link"
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="debt-comment">Комментарий</Label>
              <Textarea
                id="debt-comment"
                value={form.comment}
                onChange={(e) =>
                  setForm({ ...form, comment: e.target.value })
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

export function DebtsPage() {
  const { data, isLoading } = useListDebts({});
  const deleteDebt = useDeleteDebt();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListDebtsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardTodayQueryKey() });
  };

  const handleDelete = (debt: Debt) => {
    if (!confirm(`Удалить долг «${debt.title}»?`)) return;
    deleteDebt.mutate(
      { id: debt.id },
      {
        onSuccess: () => {
          toast({ title: "Долг удалён" });
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

  const openEdit = (debt: Debt) => {
    setEditing(debt);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Долги</h2>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Новый долг
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-4">
          {data.map((debt) => (
            <div
              key={debt.id}
              className="p-4 border rounded-lg bg-card flex justify-between items-center border-l-4 group"
              style={{
                borderLeftColor: debt.subjectColor || "var(--destructive)",
              }}
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold flex items-center gap-2">
                  {debt.title}
                  {debt.importance === "high" && (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  )}
                </h3>
                {debt.subjectName && (
                  <p className="text-sm text-muted-foreground">
                    {debt.subjectName}
                  </p>
                )}
                {debt.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {debt.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="text-sm font-medium px-2 py-1 bg-secondary rounded">
                    {debt.status === "open"
                      ? "Открыт"
                      : debt.status === "in_progress"
                        ? "В работе"
                        : "Закрыт"}
                  </span>
                  {debt.deadline && (
                    <p className="text-xs text-muted-foreground mt-2">
                      До{" "}
                      {format(new Date(debt.deadline), "d MMM HH:mm", {
                        locale: ru,
                      })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(debt)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(debt)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border rounded-lg bg-card/50">
          <p className="text-muted-foreground mb-4">Долгов нет. Отлично!</p>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Добавить долг
          </Button>
        </div>
      )}

      <DebtDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        debt={editing}
        onSaved={invalidate}
      />
    </div>
  );
}
