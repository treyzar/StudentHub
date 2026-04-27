import { useGetWeek } from "@workspace/api-client-react";
import { useState } from "react";
import { format, addWeeks, subWeeks } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function WeekPage() {
  const [weekStart, setWeekStart] = useState<Date>(new Date());
  
  const { data, isLoading } = useGetWeek({ 
    weekStart: weekStart.toISOString().split('T')[0] 
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Неделя</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={() => setWeekStart(new Date())}>
            Сегодня
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
            <ChevronRight className="w-4 h-4" />
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
            {format(new Date(data.weekStart), 'd MMMM', { locale: ru })} – {format(new Date(data.weekEnd), 'd MMMM', { locale: ru })}
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {data.days.map((day) => (
              <div key={day.date} className="border rounded-lg p-4 bg-card">
                <div className="font-medium text-center mb-4 pb-2 border-b">
                  <div className="capitalize">{format(new Date(day.date), 'EEEE', { locale: ru })}</div>
                  <div className="text-sm text-muted-foreground">{format(new Date(day.date), 'd MMM', { locale: ru })}</div>
                </div>
                <div className="space-y-2">
                  {day.lessons.map(l => (
                    <div key={l.id} className="text-xs p-2 bg-secondary rounded" style={{ borderLeft: `3px solid ${l.subjectColor || 'var(--primary)'}` }}>
                      <div className="font-semibold">{l.title}</div>
                      <div className="text-muted-foreground">{format(new Date(l.startsAt), 'HH:mm', { locale: ru })} – {format(new Date(l.endsAt), 'HH:mm', { locale: ru })}</div>
                      {l.subjectName && <div className="text-muted-foreground">{l.subjectName}</div>}
                    </div>
                  ))}
                  {day.tasks.map(t => (
                    <div key={t.id} className="text-xs p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded">
                      [Задача] {t.title}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
