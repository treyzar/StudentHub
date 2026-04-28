import { Link, useLocation } from "wouter";
import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  CheckSquare,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Sheet,
  Wallet,
  PenTool,
  StickyNote,
  GanttChartSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings, getInitials } from "@/contexts/settings";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Расписание",
    items: [
      { href: "/", label: "Сегодня", icon: LayoutDashboard },
      { href: "/week", label: "Неделя", icon: CalendarDays },
      { href: "/month", label: "Месяц", icon: CalendarRange },
      { href: "/schedule", label: "Планирование", icon: Sheet },
    ],
  },
  {
    label: "Учёба",
    items: [
      { href: "/subjects", label: "Предметы", icon: BookOpen },
      { href: "/grades", label: "Оценки", icon: GraduationCap },
      { href: "/tests", label: "Тесты", icon: PenTool },
    ],
  },
  {
    label: "Дела",
    items: [
      { href: "/tasks", label: "Задачи", icon: CheckSquare },
      { href: "/debts", label: "Долги", icon: Wallet },
      { href: "/notes", label: "Заметки", icon: StickyNote },
    ],
  },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full transition-all",
          active ? "bg-primary opacity-100" : "opacity-0",
        )}
      />
      <Icon
        className={cn(
          "w-4 h-4 transition-colors",
          active ? "text-primary" : "text-sidebar-foreground/60",
        )}
      />
      <span>{item.label}</span>
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { settings } = useSettings();
  const initials = getInitials(settings.userName);

  const isActive = (href: string) =>
    href === "/"
      ? location === "/"
      : location === href || location.startsWith(href + "/");

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-sidebar border-r border-sidebar-border flex-shrink-0 flex flex-col">
        <div className="px-5 py-6 flex items-center gap-3 border-b border-sidebar-border/60">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm shadow-sm",
              initials
                ? "bg-primary text-primary-foreground"
                : "bg-sidebar-accent text-sidebar-foreground",
            )}
          >
            {initials || <GanttChartSquare className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-sidebar-foreground leading-tight">
              StudentHub
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {settings.userName || "Твой учебный центр"}
            </p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    active={isActive(item.href)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-sidebar-border/60 p-3">
          <NavLink
            item={{ href: "/settings", label: "Настройки", icon: Settings }}
            active={isActive("/settings")}
          />
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 md:p-10">{children}</div>
      </main>
    </div>
  );
}
