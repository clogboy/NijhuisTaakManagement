import { Switch, Route, Redirect } from "wouter";
import { useQuery, QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { User } from "@shared/schema";

// Pages
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Activities from "@/pages/Activities";
import Contacts from "@/pages/Contacts";
import QuickWins from "@/pages/QuickWins";
import Roadblocks from "@/pages/Roadblocks";
import Agenda from "@/pages/Agenda";
import TimeBlocking from "@/pages/TimeBlocking";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";
import AppLayout from "@/components/layout/AppLayout";

function AuthenticatedApp() {
  return (
    <Switch>
      <Route path="/">
        <AppLayout
          title="Dashboard"
          subtitle="Activity overview and quick access"
        >
          <Dashboard />
        </AppLayout>
      </Route>
      <Route path="/activities">
        <AppLayout
          title="Activities"
          subtitle="Manage your activity dossiers"
          showCreateButton={true}
          onCreateActivity={() => {}}
        >
          <Activities />
        </AppLayout>
      </Route>
      <Route path="/contacts">
        <AppLayout
          title="Contacts"
          subtitle="Manage your contact database"
        >
          <Contacts />
        </AppLayout>
      </Route>
      <Route path="/quickwins" component={QuickWins} />
      <Route path="/roadblocks" component={Roadblocks} />
      <Route path="/agenda" component={Agenda} />
      <Route path="/timeblocking" component={TimeBlocking} />
      <Route path="/reports">
        <AppLayout
          title="Reports"
          subtitle="Analytics and insights"
        >
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-neutral-dark mb-2">
                Reports Coming Soon
              </h3>
              <p className="text-neutral-medium">
                Advanced analytics and reporting features will be available in a future update.
              </p>
            </div>
          </div>
        </AppLayout>
      </Route>
      <Route path="/profile">
        <AppLayout
          title="Profile"
          subtitle="Account information and settings"
        >
          <Profile />
        </AppLayout>
      </Route>
      <Route path="/settings">
        <AppLayout
          title="Settings"
          subtitle="Configure your preferences"
        >
          <Settings />
        </AppLayout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  const { data: user, isLoading, error } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-neutral-light">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ms-blue mx-auto mb-4"></div>
          <p className="text-neutral-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route>
          <Redirect to="/login" />
        </Route>
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/login">
        <Redirect to="/" />
      </Route>
      <Route>
        <AuthenticatedApp />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
