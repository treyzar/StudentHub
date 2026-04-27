import { useListDebts } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { AlertCircle } from "lucide-react";

export function DebtsPage() {
  const { data, isLoading } = useListDebts({});

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-3xl font-bold">Долги</h2>

      {isLoading ? (
        <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
      ) : data ? (
        <div className="grid gap-4">
          {data.map(debt => (
            <div key={debt.id} className="p-4 border rounded-lg bg-card flex justify-between items-center border-l-4" style={{ borderLeftColor: debt.subjectColor || 'var(--destructive)' }}>
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  {debt.title}
                  {debt.importance === 'high' && <AlertCircle className="w-4 h-4 text-destructive" />}
                </h3>
                <p className="text-sm text-muted-foreground">{debt.subjectName}</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium px-2 py-1 bg-secondary rounded">{debt.status}</span>
                {debt.deadline && <p className="text-xs text-muted-foreground mt-2">До {format(new Date(debt.deadline), 'd MMM', { locale: ru })}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
