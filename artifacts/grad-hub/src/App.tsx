import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { useGetMe } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Dashboard from "@/pages/dashboard";
import Connections from "@/pages/connections";
import Notifications from "@/pages/notifications";
import Profile from "@/pages/profile";
import VerifyEmail from "@/pages/verify-email";
import Admin from "@/pages/admin";
import ProjectDetail from "@/pages/project-detail";
import UserDetail from "@/pages/user-detail";
import ProjectForm from "@/pages/project-form";
import CompleteProfile from "@/pages/complete-profile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

function isProfileIncomplete(me: any): boolean {
  return !me.track || !me.bylaw || !me.gender || me.gpa == null || !me.phone;
}

function ProtectedRoute({
  component: Component,
  adminOnly = false,
  skipOnboardingCheck = false,
}: {
  component: any;
  adminOnly?: boolean;
  skipOnboardingCheck?: boolean;
}) {
  const { data: me, isLoading } = useGetMe();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!me) return <Redirect to="/login" />;

  if (!me.isVerified) return <Redirect to="/verify-email" />;

  if (adminOnly && me.role !== "admin") return <Redirect to="/dashboard" />;

  if (!skipOnboardingCheck && isProfileIncomplete(me)) {
    return <Redirect to="/complete-profile" />;
  }

  return <Component />;
}

function RootRedirect() {
  const { data: me, isLoading } = useGetMe();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }
  return <Redirect to={me ? (me.isVerified ? "/dashboard" : "/verify-email") : "/login"} />;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={RootRedirect} />

        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/verify-email" component={VerifyEmail} />

        <Route path="/complete-profile">
          <ProtectedRoute component={CompleteProfile} skipOnboardingCheck={true} />
        </Route>

        <Route path="/dashboard">
          <ProtectedRoute component={Dashboard} />
        </Route>

        <Route path="/projects/new">
          <ProtectedRoute component={ProjectForm} />
        </Route>

        <Route path="/projects/:id/edit">
          <ProtectedRoute component={ProjectForm} />
        </Route>

        <Route path="/projects/:id">
          <ProtectedRoute component={ProjectDetail} />
        </Route>

        <Route path="/users/:id">
          <ProtectedRoute component={UserDetail} />
        </Route>

        <Route path="/connections">
          <ProtectedRoute component={Connections} />
        </Route>

        <Route path="/notifications">
          <ProtectedRoute component={Notifications} />
        </Route>

        <Route path="/profile">
          <ProtectedRoute component={Profile} />
        </Route>

        <Route path="/admin">
          <ProtectedRoute component={Admin} adminOnly={true} />
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
