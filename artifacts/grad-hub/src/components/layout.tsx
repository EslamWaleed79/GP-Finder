import { useGetMe, logout } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, User, Bell, GraduationCap } from "lucide-react";
import { Button } from "./ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const { data: me } = useGetMe();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();

  if (!me) return <>{children}</>;

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Ignore logout failures and still clear local state.
    }

    localStorage.removeItem("token");
    queryClient.invalidateQueries();
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 w-full border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl text-primary hover:opacity-80 transition-opacity">
            <GraduationCap className="w-6 h-6" />
            GP Finder
          </Link>
          
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/dashboard" className={`hover:text-primary transition-colors ${location === '/dashboard' ? 'text-primary' : 'text-muted-foreground'}`}>
              Discover
            </Link>
            <Link href="/connections" className={`hover:text-primary transition-colors ${location === '/connections' ? 'text-primary' : 'text-muted-foreground'}`}>
              Connections
            </Link>
            <Link href="/notifications" className={`hover:text-primary transition-colors ${location === '/notifications' ? 'text-primary' : 'text-muted-foreground'}`}>
              Notifications
            </Link>
            {me.role === "admin" && (
              <Link href="/admin" className={`hover:text-primary transition-colors ${location === '/admin' ? 'text-primary' : 'text-muted-foreground'}`}>
                Admin
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/profile" className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
              <User className="w-4 h-4" />
              {me.name}
            </Link>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
