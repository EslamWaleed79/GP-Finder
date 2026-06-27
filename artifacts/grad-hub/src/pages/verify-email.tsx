import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Link, Redirect } from "wouter";
import { useVerifyEmail, useGetMe } from "@workspace/api-client-react";
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
  const { data: me } = useGetMe();
  
  // Redirect to dashboard if user is already verified
  if (me?.isVerified === true) {
    return <Redirect to="/dashboard" />;
  }
  const verifyEmail = useVerifyEmail({
    mutation: {
      onSuccess: () => {
        toast({ title: "Email verified successfully", duration: 2000 });
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("pendingVerificationEmail");
          // Hard redirect forces React unmount and fresh /api/auth/me fetch
          window.location.href = "/dashboard";
        }
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

  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
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

  const onResendOtp = async () => {
    const email = form.getValues("email").trim();
    if (!email) {
      setResendStatus("Enter your email before requesting a new code.");
      return;
    }

    setResendLoading(true);
    setResendStatus(null);

    try {
      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Failed to resend OTP");
      }

      setResendStatus("Verification code resent. Check your inbox.");
    } catch (error: any) {
      setResendStatus(error?.message || "Unable to resend OTP.");
    } finally {
      setResendLoading(false);
    }
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
          <div className="mt-4 flex flex-col gap-3">
            <Button type="button" variant="outline" className="w-full" onClick={onResendOtp} disabled={resendLoading}>
              {resendLoading ? "Sending..." : "Resend Verification Code"}
            </Button>
            {resendStatus && (
              <p className="text-sm text-center text-muted-foreground">{resendStatus}</p>
            )}
          </div>
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
