import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function SettingsPage() {
  const toggleDark = () => {
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-3xl font-bold">Настройки</h2>

      <Card>
        <CardHeader>
          <CardTitle>Внешний вид</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <Label htmlFor="dark-mode" className="text-base">Тёмная тема</Label>
          <Switch id="dark-mode" onCheckedChange={toggleDark} defaultChecked={document.documentElement.classList.contains('dark')} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Интеграции</CardTitle>
          <CardDescription>Скоро появится возможность подключения внешних сервисов</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between opacity-50">
            <div>
              <div className="font-medium">Google Calendar</div>
              <div className="text-sm text-muted-foreground">Синхронизация расписания пар</div>
            </div>
            <span className="text-xs px-2 py-1 bg-secondary rounded">Скоро</span>
          </div>
          <div className="flex items-center justify-between opacity-50">
            <div>
              <div className="font-medium">Google Sheets</div>
              <div className="text-sm text-muted-foreground">Экспорт и импорт оценок</div>
            </div>
            <span className="text-xs px-2 py-1 bg-secondary rounded">Скоро</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
