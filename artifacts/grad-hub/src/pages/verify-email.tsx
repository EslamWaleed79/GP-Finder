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
  otp: z.string().trim().length(6, "Enter the 6-digit code"),
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
          window.sessionStorage.removeItem("pendingRegistrationToken");
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

  const isSubmitting = verifyEmail.isPending;

  const form = useForm<VerifyData>({
    resolver: zodResolver(verifySchema),
    defaultValues: { otp: "" },
  });

  const onSubmit = (data: VerifyData) => {
    if (typeof window === "undefined") return;

    const pendingRegistrationToken = window.sessionStorage.getItem("pendingRegistrationToken");
    if (!pendingRegistrationToken) {
      toast({
        title: "Verification session expired",
        description: "Please sign up again to receive a new code.",
        variant: "destructive",
      });
      return;
    }

    verifyEmail.mutate({ data: { pendingRegistrationToken, otp: data.otp } });
  };

  const handleGoBackToSignup = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("pendingRegistrationToken");
    }
    setLocation("/signup");
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
              <Label htmlFor="otp">Verification Code</Label>
              <Input id="otp" {...form.register("otp")} placeholder="123456" />
              {form.formState.errors.otp && (
                <p className="text-sm text-destructive">{form.formState.errors.otp.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Verifying..." : "Verify"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={handleGoBackToSignup}
              className="text-primary hover:underline font-medium"
            >
              Typo in your email? Go back to Sign Up
            </button>
          </div>
          <div className="mt-4 text-center text-sm">
            Already verified? <Link href="/login" className="text-primary hover:underline font-medium">Log in</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
