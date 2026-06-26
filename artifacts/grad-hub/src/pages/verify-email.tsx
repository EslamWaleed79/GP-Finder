import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Link } from "wouter";
import { useVerifyEmail } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const verifySchema = z.object({
  email: z.string().email("Enter a valid email"),
  code: z.string().trim().length(6, "Enter the 6-digit code"),
});

type VerifyData = z.infer<typeof verifySchema>;

export default function VerifyEmail() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const verifyEmail = useVerifyEmail({
    mutation: {
      onSuccess: () => {
        toast({ title: "Email verified successfully", duration: 2000 });
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("pendingVerificationEmail");
        }
        setLocation("/dashboard");
      },
      onError: (error: any) => {
        toast({
          title: "Verification failed",
          description: error?.message || "Please try again",
          variant: "destructive",
        });
      },
    },
  });

  const isSubmitting = verifyEmail.isPending;

  const form = useForm<VerifyData>({
    resolver: zodResolver(verifySchema),
    defaultValues: { email: "", code: "" },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedEmail = window.localStorage.getItem("pendingVerificationEmail");
    if (storedEmail) {
      form.setValue("email", storedEmail);
    }
  }, []);

  const onSubmit = (data: VerifyData) => {
    verifyEmail.mutate({ data });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Verify Your Email</CardTitle>
          <CardDescription>
            Enter the 6-digit code sent to your university email to complete signup.
          </CardDescription>
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
              <Label htmlFor="code">Verification Code</Label>
              <Input id="code" {...form.register("code")} placeholder="123456" />
              {form.formState.errors.code && (
                <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Verifying..." : "Verify Email"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Didn’t receive the code? Check your spam folder or try signing up again.
          </div>
          <div className="mt-4 text-center text-sm">
            Already verified? <Link href="/login" className="text-primary hover:underline font-medium">Log in</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
