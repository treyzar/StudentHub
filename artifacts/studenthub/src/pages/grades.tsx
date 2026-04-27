import { useListGrades, useGetGradeSummary } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

export function GradesPage() {
  const { data: summary, isLoading: isLoadingSummary } = useGetGradeSummary();
  const { data: grades, isLoading: isLoadingGrades } = useListGrades({});

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-3xl font-bold">Оценки</h2>

      {isLoadingSummary ? <Skeleton className="h-32" /> : summary ? (
        <div className="p-6 border rounded-lg bg-primary text-primary-foreground">
          <div className="text-sm opacity-90">Общий средний балл</div>
          <div className="text-5xl font-bold mt-2">{summary.overallAverage?.toFixed(2) || '—'}</div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summary?.bySubject.map(s => (
          <div key={s.subjectId} className="p-4 border rounded-lg bg-card">
            <div className="text-sm text-muted-foreground truncate">{s.subjectName}</div>
            <div className="text-2xl font-semibold mt-1">{s.average?.toFixed(1) || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
