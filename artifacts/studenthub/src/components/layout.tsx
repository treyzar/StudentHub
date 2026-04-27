import { Link, useLocation } from "wouter";
import { 
  BookOpen, 
  CalendarDays, 
  CheckSquare, 
  GraduationCap, 
  LayoutDashboard, 
  Settings, 
  Wallet,
  PenTool
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Сегодня", icon: LayoutDashboard },
  { href: "/week", label: "Неделя", icon: CalendarDays },
  { href: "/tasks", label: "Задачи", icon: CheckSquare },
  { href: "/subjects", label: "Предметы", icon: BookOpen },
  { href: "/debts", label: "Долги", icon: Wallet },
  { href: "/grades", label: "Оценки", icon: GraduationCap },
  { href: "/tests", label: "Тесты", icon: PenTool },
  { href: "/notes", label: "Заметки", icon: PenTool },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-sidebar border-r border-sidebar-border flex-shrink-0">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-sidebar-foreground">StudentHub</h1>
          <p className="text-sm text-muted-foreground mt-1">Твой учебный центр</p>
        </div>
        <nav className="px-4 pb-6 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link key={item.href} href={item.href} className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}>
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto p-4">
          <Link href="/settings" className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
            location === "/settings" 
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          )}>
            <Settings className="w-4 h-4" />
            Настройки
          </Link>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
