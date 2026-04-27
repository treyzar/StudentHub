import { useListSubjects } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export function SubjectsPage() {
  const { data, isLoading } = useListSubjects();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Предметы</h2>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map(subject => (
            <Link key={subject.id} href={`/subjects/${subject.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer overflow-hidden border-t-4" style={{ borderTopColor: subject.color }}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{subject.name}</span>
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 truncate">{subject.teacher || "Преподаватель не указан"}</p>
                  
                  <div className="flex gap-4 text-sm">
                    {subject.averageGrade !== null && (
                      <div>
                        <div className="font-semibold">{subject.averageGrade.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">Ср. балл</div>
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-destructive">{subject.debtCount}</div>
                      <div className="text-xs text-muted-foreground">Долгов</div>
                    </div>
                    <div>
                      <div className="font-semibold">{subject.taskCount}</div>
                      <div className="text-xs text-muted-foreground">Задач</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
