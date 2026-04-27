import { useGetSubject } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SubjectDetailPage() {
  const { id } = useParams();
  const { data, isLoading } = useGetSubject(Number(id));

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!data) return <div>Предмет не найден</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="p-6 rounded-lg text-white" style={{ backgroundColor: data.subject.color }}>
        <h2 className="text-3xl font-bold">{data.subject.name}</h2>
        <p className="opacity-90 mt-2">{data.subject.teacher}</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="lessons">Уроки</TabsTrigger>
          <TabsTrigger value="grades">Оценки</TabsTrigger>
          <TabsTrigger value="tasks">Задачи</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded bg-card">
              <div className="text-sm text-muted-foreground">Средний балл</div>
              <div className="text-3xl font-bold">{data.averageGrade?.toFixed(1) || '—'}</div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="lessons">Уроки...</TabsContent>
        <TabsContent value="grades">Оценки...</TabsContent>
        <TabsContent value="tasks">Задачи...</TabsContent>
      </Tabs>
    </div>
  );
}
