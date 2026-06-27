import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export default function Login() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  
  const login = useLogin({
    mutation: {
      onSuccess: (data: any) => {
        if (data?.token) {
          localStorage.setItem("token", data.token);
        }

        // Hard redirect forces React unmount and fresh /api/auth/me fetch
        window.location.href = "/dashboard";
      },
      onError: (err: any) => {
        // Check if error is due to unverified email (403 or message contains "verify")
        const isUnverifiedError = err?.status === 403 || (err?.message && err.message.toLowerCase().includes("verify"));
        
        if (isUnverifiedError) {
          // Save email to localStorage and redirect to verify-email page
          const email = form.getValues("email");
          localStorage.setItem("pendingVerificationEmail", email);
          setLocation("/verify-email");
        } else {
          // Display standard error toast for other errors
          toast({
            title: "Login Failed",
            description: err.message || "Invalid credentials",
            variant: "destructive",
          });
        }
      }
    }
  });

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    login.mutate({ data });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome to GP Finder</CardTitle>
          <CardDescription>Enter your @eng.asu.edu.eg email to log in</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" {...form.register("email")} placeholder="student@eng.asu.edu.eg" />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...form.register("password")} />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? "Logging in..." : "Log in"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            Don't have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
