import { useSignup, getGetMeQueryKey, useListMajors, useListSkillTags } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const step1Schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email().refine(val => val.endsWith("@eng.asu.edu.eg"), "Must be an @eng.asu.edu.eg email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const step2Schema = z.object({
  major: z.string().min(1, "Major is required"),
  skills: z.array(z.string()).min(1, "Select at least one skill"),
  bio: z.string().optional(),
  phone: z.string().optional(),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

export default function Signup() {
  const [step, setStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: majors = [] } = useListMajors();
  const { data: allSkills = [] } = useListSkillTags();

  const signup = useSignup({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setLocation("/dashboard");
      },
      onError: (err: any) => {
        toast({
          title: "Signup Failed",
          description: err.message || "An error occurred",
          variant: "destructive",
        });
      }
    }
  });

  const form1 = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { name: "", email: "", password: "" }
  });

  const form2 = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: { major: "", skills: [], bio: "", phone: "" }
  });

  const onStep1Submit = (data: Step1Data) => {
    setStep1Data(data);
    setStep(2);
  };

  const onStep2Submit = (data: Step2Data) => {
    if (!step1Data) return;
    signup.mutate({ data: { ...step1Data, ...data, phone: data.phone || null, bio: data.bio || null } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Create an account</CardTitle>
          <CardDescription>
            {step === 1 ? "Basic information" : "Your academic profile"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form onSubmit={form1.handleSubmit(onStep1Submit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" {...form1.register("name")} />
                {form1.formState.errors.name && (
                  <p className="text-sm text-destructive">{form1.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">University Email</Label>
                <Input id="email" {...form1.register("email")} placeholder="student@eng.asu.edu.eg" />
                {form1.formState.errors.email && (
                  <p className="text-sm text-destructive">{form1.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" {...form1.register("password")} />
                {form1.formState.errors.password && (
                  <p className="text-sm text-destructive">{form1.formState.errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full">Continue</Button>
            </form>
          ) : (
            <form onSubmit={form2.handleSubmit(onStep2Submit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Major</Label>
                <Select onValueChange={(val) => form2.setValue("major", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select major" />
                  </SelectTrigger>
                  <SelectContent>
                    {majors.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form2.formState.errors.major && (
                  <p className="text-sm text-destructive">{form2.formState.errors.major.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Bio (Optional)</Label>
                <Textarea {...form2.register("bio")} placeholder="Tell us about yourself..." />
              </div>
              <div className="space-y-2">
                <Label>Phone (Optional)</Label>
                <Input {...form2.register("phone")} placeholder="+20 1..." />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-1/3">
                  Back
                </Button>
                <Button type="submit" className="w-2/3" disabled={signup.isPending}>
                  {signup.isPending ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </form>
          )}

          {step === 1 && (
            <div className="mt-6 text-center text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Log in
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
