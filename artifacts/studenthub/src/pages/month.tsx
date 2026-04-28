import { useMemo, useState } from "react";
import {
  useListLessons,
  type Lesson,
} from "@workspace/api-client-react";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/settings";
import { formatTime } from "@/lib/time";

const WEEKDAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

function weekdayInfo(
  weekStartsOn: 0 | 1,
): { label: string; weekday: number }[] {
  const base = startOfWeek(new Date(), { weekStartsOn });
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return { label: format(d, "EEEEEE", { locale: ru }), weekday: d.getDay() };
  });
}

interface DayCell {
  date: Date;
  lessons: Lesson[];
}

export function MonthPage() {
  const { settings } = useSettings();
  const weekStartsOn = settings.weekStartsOn;
  const [cursor, setCursor] = useState<Date>(startOfMonth(new Date()));

  const gridStart = useMemo(
    () => startOfWeek(startOfMonth(cursor), { weekStartsOn }),
    [cursor, weekStartsOn],
  );
  const gridEnd = useMemo(
    () => endOfWeek(endOfMonth(cursor), { weekStartsOn }),
    [cursor, weekStartsOn],
  );

  const { data: lessons, isLoading } = useListLessons({
    from: gridStart.toISOString(),
    to: gridEnd.toISOString(),
  });

  const cells = useMemo<DayCell[]>(() => {
    const out: DayCell[] = [];
    const cur = new Date(gridStart);
    while (cur <= gridEnd) {
      out.push({ date: new Date(cur), lessons: [] });
      cur.setDate(cur.getDate() + 1);
    }
    if (lessons) {
      for (const l of lessons) {
        const start = new Date(l.startsAt);
        const cell = out.find((c) => isSameDay(c.date, start));
        if (cell) cell.lessons.push(l);
      }
      for (const cell of out) {
        cell.lessons.sort(
          (a, b) =>
            new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        );
      }
    }
    return out;
  }, [gridStart, gridEnd, lessons]);

  const allWeekdays = weekdayInfo(weekStartsOn);
  const labels = settings.hideWeekends
    ? allWeekdays.filter((w) => w.weekday !== 0 && w.weekday !== 6)
    : allWeekdays;
  const visibleCells = settings.hideWeekends
    ? cells.filter((c) => {
        const d = c.date.getDay();
        return d !== 0 && d !== 6;
      })
    : cells;
  const colsClass = settings.hideWeekends ? "grid-cols-5" : "grid-cols-7";
  const today = new Date();
  void WEEKDAY_KEYS;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-3xl font-bold">Месяц</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCursor(subMonths(cursor, 1))}
            aria-label="Предыдущий месяц"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setCursor(startOfMonth(new Date()))}
          >
            Этот месяц
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCursor(addMonths(cursor, 1))}
            aria-label="Следующий месяц"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground capitalize">
        {format(cursor, "LLLL yyyy", { locale: ru })}
      </p>

      <div
        className={`grid ${colsClass} gap-px bg-border rounded-lg overflow-hidden border`}
      >
        {labels.map((w) => (
          <div
            key={w.label}
            className="bg-muted/40 px-2 py-2 text-center text-xs font-medium text-muted-foreground capitalize"
          >
            {w.label}
          </div>
        ))}

        {isLoading
          ? Array.from({ length: visibleCells.length || 35 }).map((_, i) => (
              <div key={i} className="bg-card min-h-28 p-2">
                <Skeleton className="h-4 w-6 mb-2" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))
          : visibleCells.map((cell) => {
              const inMonth = isSameMonth(cell.date, cursor);
              const isToday = isSameDay(cell.date, today);
              const visible = cell.lessons.slice(0, 3);
              const extra = cell.lessons.length - visible.length;
              return (
                <div
                  key={cell.date.toISOString()}
                  className={cn(
                    "bg-card min-h-28 p-2 flex flex-col gap-1",
                    !inMonth && "bg-muted/20",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full",
                        !inMonth && "text-muted-foreground/60",
                        isToday &&
                          "bg-primary text-primary-foreground font-semibold",
                      )}
                    >
                      {cell.date.getDate()}
                    </span>
                    {cell.lessons.length > 0 && !isToday && (
                      <span className="text-[10px] text-muted-foreground">
                        {cell.lessons.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    {visible.map((l) => (
                      <div
                        key={l.id}
                        className="text-[11px] leading-tight px-1.5 py-0.5 rounded truncate bg-secondary"
                        style={{
                          borderLeft: `2px solid ${l.subjectColor || "var(--primary)"}`,
                        }}
                        title={`${formatTime(l.startsAt, settings.timeFormat)} ${l.title}`}
                      >
                        <span className="text-muted-foreground mr-1">
                          {formatTime(l.startsAt, settings.timeFormat)}
                        </span>
                        {l.title}
                      </div>
                    ))}
                    {extra > 0 && (
                      <div className="text-[10px] text-muted-foreground px-1.5">
                        +{extra} ещё
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}
