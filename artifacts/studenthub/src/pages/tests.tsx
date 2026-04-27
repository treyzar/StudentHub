import { useListTests } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export function TestsPage() {
  const { data, isLoading } = useListTests({});

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-3xl font-bold">Тесты</h2>

      {isLoading ? <Skeleton className="h-32" /> : data ? (
        <div className="grid gap-4">
          {data.map(test => (
            <div key={test.id} className="p-4 border rounded-lg bg-card border-l-4" style={{ borderLeftColor: test.subjectColor || 'var(--primary)' }}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{test.title}</h3>
                  <p className="text-sm text-muted-foreground">{test.subjectName}</p>
                </div>
                <div className="text-right">
                  <div className="font-medium">{format(new Date(test.scheduledAt), 'd MMM HH:mm', { locale: ru })}</div>
                  <span className="text-xs px-2 py-1 bg-secondary rounded mt-1 inline-block">{test.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
