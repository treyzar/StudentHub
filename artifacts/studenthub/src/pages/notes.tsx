import {
  useListNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  getListNotesQueryKey,
  type Note,
  type NoteInput,
} from "@workspace/api-client-react";
import { useState, useMemo } from "react";
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
import { SubjectSelect } from "@/components/subject-select";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface NoteFormState {
  title: string;
  content: string;
  subjectId: number | null;
  tagsRaw: string;
}

function emptyForm(): NoteFormState {
  return { title: "", content: "", subjectId: null, tagsRaw: "" };
}

function noteToForm(n: Note): NoteFormState {
  return {
    title: n.title,
    content: n.content,
    subjectId: n.subjectId ?? null,
    tagsRaw: (n.tags ?? []).join(", "),
  };
}

function formToInput(f: NoteFormState): NoteInput {
  const tags = f.tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return {
    title: f.title.trim(),
    content: f.content,
    subjectId: f.subjectId,
    tags,
  };
}

interface NoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: Note | null;
  onSaved: (saved?: Note) => void;
}

function NoteDialog({ open, onOpenChange, note, onSaved }: NoteDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<NoteFormState>(emptyForm());
  const create = useCreateNote();
  const update = useUpdateNote();
  const isEdit = note != null;

  const handleOpenChange = (next: boolean) => {
    if (next) setForm(note ? noteToForm(note) : emptyForm());
    onOpenChange(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = formToInput(form);
    if (!input.title) {
      toast({ title: "Введите заголовок", variant: "destructive" });
      return;
    }
    if (!input.content) {
      toast({ title: "Заполните содержимое", variant: "destructive" });
      return;
    }
    const onError = () =>
      toast({ title: "Не удалось сохранить", variant: "destructive" });
    if (isEdit && note) {
      update.mutate(
        { id: note.id, data: input },
        {
          onSuccess: (data) => {
            toast({ title: "Заметка обновлена" });
            onSaved(data);
            onOpenChange(false);
          },
          onError,
        },
      );
    } else {
      create.mutate(
        { data: input },
        {
          onSuccess: (data) => {
            toast({ title: "Заметка создана" });
            onSaved(data);
            onOpenChange(false);
          },
          onError,
        },
      );
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Редактировать заметку" : "Новая заметка"}
            </DialogTitle>
            <DialogDescription>
              Обязательны заголовок и содержимое.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="note-title">Заголовок *</Label>
              <Input
                id="note-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
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
            <div className="space-y-2">
              <Label htmlFor="note-tags">Теги (через запятую)</Label>
              <Input
                id="note-tags"
                value={form.tagsRaw}
                onChange={(e) => setForm({ ...form, tagsRaw: e.target.value })}
                placeholder="лекция, формулы, важное"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note-content">Содержимое *</Label>
              <Textarea
                id="note-content"
                value={form.content}
                onChange={(e) =>
                  setForm({ ...form, content: e.target.value })
                }
                rows={10}
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

export function NotesPage() {
  const { data, isLoading } = useListNotes({});
  const deleteNote = useDeleteNote();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
  };

  const selectedNote = useMemo(
    () => data?.find((n) => n.id === selectedId) ?? null,
    [data, selectedId],
  );

  const handleDelete = (note: Note) => {
    if (!confirm(`Удалить заметку «${note.title}»?`)) return;
    deleteNote.mutate(
      { id: note.id },
      {
        onSuccess: () => {
          toast({ title: "Заметка удалена" });
          if (selectedId === note.id) setSelectedId(null);
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

  const openEdit = (note: Note) => {
    setEditing(note);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Заметки</h2>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Новая заметка
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : data && data.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 border-r pr-4 space-y-2 max-h-[70vh] overflow-y-auto">
            {data.map((note) => (
              <div
                key={note.id}
                onClick={() => setSelectedId(note.id)}
                className={`p-3 border rounded cursor-pointer transition-colors ${
                  selectedId === note.id
                    ? "bg-secondary border-primary"
                    : "hover:bg-secondary"
                }`}
                style={
                  note.subjectColor
                    ? { borderLeftWidth: 3, borderLeftColor: note.subjectColor }
                    : undefined
                }
              >
                <div className="font-medium truncate">{note.title}</div>
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  {note.subjectName || "Без предмета"}
                </div>
                {note.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {note.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-1.5 py-0.5 bg-background rounded border"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="col-span-2 p-4 border rounded bg-card/50 min-h-[400px]">
            {selectedNote ? (
              <div className="space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="text-2xl font-bold">{selectedNote.title}</h3>
                    <div className="text-sm text-muted-foreground mt-1">
                      {selectedNote.subjectName && (
                        <span className="mr-3">{selectedNote.subjectName}</span>
                      )}
                      <span>
                        Обновлено{" "}
                        {format(
                          new Date(selectedNote.updatedAt),
                          "d MMM yyyy",
                          { locale: ru },
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(selectedNote)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(selectedNote)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {selectedNote.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {selectedNote.tags.map((t) => (
                      <span
                        key={t}
                        className="text-xs px-2 py-1 bg-background rounded border"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {selectedNote.content}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Выберите заметку слева
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 border rounded-lg bg-card/50">
          <p className="text-muted-foreground mb-4">Заметок пока нет</p>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Создать первую
          </Button>
        </div>
      )}

      <NoteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        note={editing}
        onSaved={(saved) => {
          invalidate();
          if (saved) setSelectedId(saved.id);
        }}
      />
    </div>
  );
}
