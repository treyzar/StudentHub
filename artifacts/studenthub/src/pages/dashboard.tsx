import { useGetDashboardToday } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";
import { useSettings } from "@/contexts/settings";
import { computeFreeSlots } from "@/lib/free-slots";

export function Dashboard() {
  const { data, isLoading } = useGetDashboardToday();
  const { settings } = useSettings();

  const freeSlots = useMemo(() => {
    if (!data) return [];
    return computeFreeSlots(
      new Date(data.date),
      data.lessons.map((l) => ({ startsAt: l.startsAt, endsAt: l.endsAt })),
      settings.dayStart,
      settings.dayEnd,
    );
  }, [data, settings.dayStart, settings.dayEnd]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold">Сегодня</h2>
        <p className="text-muted-foreground mt-2 capitalize">
          {format(new Date(data.date), "EEEE, d MMMM yyyy", { locale: ru })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Задачи на сегодня</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.tasksDoneToday} / {data.stats.tasksToday}</div>
            <p className="text-xs text-muted-foreground mt-1">Завершено</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Пары</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.lessonsToday}</div>
            <p className="text-xs text-muted-foreground mt-1">Запланировано</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Срочные долги</CardTitle>
            <AlertCircle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{data.stats.openDebts}</div>
            <p className="text-xs text-muted-foreground mt-1">Требуют внимания</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-xl font-semibold mb-4 border-b pb-2">Расписание</h3>
          {data.lessons.length > 0 ? (
            <div className="space-y-3">
              {data.lessons.map(lesson => (
                <Card key={lesson.id} className="border-l-4" style={{ borderLeftColor: lesson.subjectColor || 'var(--primary)' }}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{lesson.title}</h4>
                        <p className="text-sm text-muted-foreground">{lesson.subjectName}</p>
                      </div>
                      <div className="text-sm text-right">
                        <div>{format(new Date(lesson.startsAt), "HH:mm", { locale: ru })} – {format(new Date(lesson.endsAt), "HH:mm", { locale: ru })}</div>
                        <div className="text-muted-foreground">{lesson.location}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground italic text-sm">На сегодня пар нет. Отдыхай!</p>
          )}
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4 border-b pb-2">Свободные окна</h3>
          {freeSlots.length > 0 ? (
            <div className="space-y-3">
              {freeSlots.map((slot, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-secondary rounded-md">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{format(new Date(slot.startsAt), "HH:mm", { locale: ru })} – {format(new Date(slot.endsAt), "HH:mm", { locale: ru })}</span>
                  <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded-full ml-auto">
                    {slot.durationMinutes} мин
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground italic text-sm">Свободного времени сегодня нет.</p>
          )}
        </div>
      </div>
    </div>
  );
}
