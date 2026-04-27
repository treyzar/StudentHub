import { useListNotes } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

export function NotesPage() {
  const { data, isLoading } = useListNotes({});

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-3xl font-bold">Заметки</h2>

      {isLoading ? <Skeleton className="h-64" /> : data ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 border-r pr-4 space-y-2">
            {data.map(note => (
              <div key={note.id} className="p-3 border rounded cursor-pointer hover:bg-secondary transition-colors">
                <div className="font-medium truncate">{note.title}</div>
                <div className="text-xs text-muted-foreground mt-1 truncate">{note.subjectName}</div>
              </div>
            ))}
          </div>
          <div className="col-span-2 p-4 flex items-center justify-center text-muted-foreground border rounded bg-card/50">
            Выберите заметку слева
          </div>
        </div>
      ) : null}
    </div>
  );
}
