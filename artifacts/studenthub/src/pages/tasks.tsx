import { useListTasks, useUpdateTask, getListTasksQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export function TasksPage() {
  const [filter, setFilter] = useState("all");
  const { data, isLoading } = useListTasks({});
  const updateTask = useUpdateTask();
  const queryClient = useQueryClient();

  const handleToggle = (id: number, title: string, currentStatus: string) => {
    updateTask.mutate(
      { id, data: { title, status: currentStatus === 'done' ? 'todo' : 'done' } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }) }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Задачи</h2>
      </div>

      <div className="flex gap-2">
        {['all', 'todo', 'in_progress', 'done'].map(f => (
          <button 
            key={f} 
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
          >
            {f === 'all' ? 'Все' : f === 'todo' ? 'К выполнению' : f === 'in_progress' ? 'В работе' : 'Готово'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : data ? (
        <div className="space-y-3">
          {data.filter(t => filter === 'all' || t.status === filter).map(task => (
            <div key={task.id} className="flex items-center gap-4 p-4 border rounded-lg bg-card">
              <Checkbox 
                checked={task.status === 'done'} 
                onCheckedChange={() => handleToggle(task.id, task.title, task.status)}
              />
              <div className="flex-1">
                <div className={`font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                  {task.title}
                </div>
                {task.subjectName && (
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: task.subjectColor || 'var(--primary)' }} />
                    {task.subjectName}
                  </div>
                )}
              </div>
              {task.dueDate && (
                <div className="text-sm text-muted-foreground">
                  {format(new Date(task.dueDate), 'd MMM', { locale: ru })}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
