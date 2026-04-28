import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { Dashboard } from "@/pages/dashboard";
import { WeekPage } from "@/pages/week";
import { MonthPage } from "@/pages/month";
import { TasksPage } from "@/pages/tasks";
import { SubjectsPage } from "@/pages/subjects";
import { SubjectDetailPage } from "@/pages/subject-detail";
import { DebtsPage } from "@/pages/debts";
import { GradesPage } from "@/pages/grades";
import { TestsPage } from "@/pages/tests";
import { NotesPage } from "@/pages/notes";
import { SettingsPage } from "@/pages/settings";
import { SettingsProvider } from "@/contexts/settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/week" component={WeekPage} />
        <Route path="/month" component={MonthPage} />
        <Route path="/tasks" component={TasksPage} />
        <Route path="/subjects" component={SubjectsPage} />
        <Route path="/subjects/:id" component={SubjectDetailPage} />
        <Route path="/debts" component={DebtsPage} />
        <Route path="/grades" component={GradesPage} />
        <Route path="/tests" component={TestsPage} />
        <Route path="/notes" component={NotesPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

export default App;
