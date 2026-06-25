import {
  useSignup,
  getGetMeQueryKey,
  useListSkillTags,
} from "@workspace/api-client-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TRACKS = [
  "Software Engineering",
  "Hardware Design",
  "Networks and Cybersecurity",
  "AI",
  "Embedded",
  "Other",
] as const;

const EGYPTIAN_PHONE_RE = /^01[0-2,5]{1}[0-9]{8}$/;

const step1Schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z
    .string()
    .email()
    .refine(
      (val) => val.endsWith("@eng.asu.edu.eg"),
      "Must be an @eng.asu.edu.eg email"
    ),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const step2Schema = z
  .object({
    track: z.enum(TRACKS, { required_error: "Track is required" }),
    customTrack: z.string().optional(),
    bylaw: z.enum(["2018", "2023"] as const, { required_error: "Bylaw is required" }),
    gender: z.enum(["Male", "Female"] as const, { required_error: "Gender is required" }),
    gpa: z.coerce
      .number({ invalid_type_error: "GPA must be a number" })
      .min(0, "GPA must be ≥ 0.0")
      .max(4.0, "GPA must be ≤ 4.0"),
    phone: z
      .string()
      .regex(EGYPTIAN_PHONE_RE, "Must be a valid Egyptian mobile number (e.g. 01012345678)"),
    skills: z.array(z.string()).min(1, "Select at least one skill"),
    bio: z.string().optional(),
  })
  .refine(
    (d) => d.track !== "Other" || (d.customTrack && d.customTrack.trim().length > 0),
    { message: "Custom track is required when track is 'Other'", path: ["customTrack"] }
  );

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

export default function Signup() {
  const [step, setStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
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
          description: err?.message || "An error occurred",
          variant: "destructive",
        });
      },
    },
  });

  const form1 = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const form2 = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      track: undefined,
      customTrack: "",
      bylaw: undefined,
      gender: undefined,
      gpa: undefined as any,
      phone: "",
      skills: [],
      bio: "",
    },
  });

  const onStep1Submit = (data: Step1Data) => {
    setStep1Data(data);
    setStep(2);
  };

  const onStep2Submit = (data: Step2Data) => {
    if (!step1Data) return;
    signup.mutate({
      data: {
        ...step1Data,
        ...data,
        customTrack: data.track === "Other" ? data.customTrack ?? null : null,
        bio: data.bio || undefined,
      } as any,
    });
  };

  const selectedSkills = form2.watch("skills");
  const watchTrack = form2.watch("track");

  const toggleSkill = (skill: string) => {
    const current = form2.getValues("skills");
    if (current.includes(skill)) {
      form2.setValue("skills", current.filter((s) => s !== skill), { shouldValidate: true });
    } else {
      form2.setValue("skills", [...current, skill], { shouldValidate: true });
    }
  };

  const addCustomSkill = (raw: string) => {
    const skill = raw.trim();
    if (!skill) return;
    const current = form2.getValues("skills");
    if (!current.includes(skill)) {
      form2.setValue("skills", [...current, skill], { shouldValidate: true });
    }
  };

  const stepProgress = (step / 2) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Join GP Finder</CardTitle>
          <CardDescription>
            {step === 1 ? "Step 1 of 2 — Basic information" : "Step 2 of 2 — Your academic profile"}
          </CardDescription>
          <div className="flex gap-1 justify-center mt-2">
            <div className={`h-1 w-20 rounded-full transition-colors ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
            <div className={`h-1 w-20 rounded-full transition-colors ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
          </div>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form onSubmit={form1.handleSubmit(onStep1Submit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input {...form1.register("name")} placeholder="Your full name" />
                {form1.formState.errors.name && (
                  <p className="text-sm text-destructive">{form1.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>University Email</Label>
                <Input {...form1.register("email")} placeholder="student@eng.asu.edu.eg" />
                {form1.formState.errors.email && (
                  <p className="text-sm text-destructive">{form1.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" autoComplete="new-password" {...form1.register("password")} />
                {form1.formState.errors.password && (
                  <p className="text-sm text-destructive">{form1.formState.errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full">Continue →</Button>
              <div className="text-center text-sm">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">Log in</Link>
              </div>
            </form>
          ) : (
            <form onSubmit={form2.handleSubmit(onStep2Submit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Track */}
              <div className="space-y-2">
                <Label>Track</Label>
                <Select onValueChange={(v) => form2.setValue("track", v as any, { shouldValidate: true })}>
                  <SelectTrigger><SelectValue placeholder="Select your track" /></SelectTrigger>
                  <SelectContent>
                    {TRACKS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form2.formState.errors.track && (
                  <p className="text-sm text-destructive">{form2.formState.errors.track.message}</p>
                )}
              </div>
              {watchTrack === "Other" && (
                <div className="space-y-2">
                  <Label>Specify Your Track</Label>
                  <Input {...form2.register("customTrack")} placeholder="e.g. Biomedical Engineering" />
                  {form2.formState.errors.customTrack && (
                    <p className="text-sm text-destructive">{form2.formState.errors.customTrack.message}</p>
                  )}
                </div>
              )}

              {/* Bylaw + Gender row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bylaw</Label>
                  <Select onValueChange={(v) => form2.setValue("bylaw", v as any, { shouldValidate: true })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2018">2018</SelectItem>
                      <SelectItem value="2023">2023</SelectItem>
                    </SelectContent>
                  </Select>
                  {form2.formState.errors.bylaw && (
                    <p className="text-sm text-destructive">{form2.formState.errors.bylaw.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select onValueChange={(v) => form2.setValue("gender", v as any, { shouldValidate: true })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  {form2.formState.errors.gender && (
                    <p className="text-sm text-destructive">{form2.formState.errors.gender.message}</p>
                  )}
                </div>
              </div>

              {/* GPA + Phone row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>GPA <span className="text-muted-foreground text-xs">(0.0–4.0, private)</span></Label>
                  <Input type="number" step="0.01" min="0" max="4" {...form2.register("gpa")} placeholder="3.5" />
                  {form2.formState.errors.gpa && (
                    <p className="text-sm text-destructive">{form2.formState.errors.gpa.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Phone <span className="text-muted-foreground text-xs">(private)</span></Label>
                  <Input {...form2.register("phone")} placeholder="01012345678" />
                  {form2.formState.errors.phone && (
                    <p className="text-sm text-destructive">{form2.formState.errors.phone.message}</p>
                  )}
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-2">
                <Label>Skills <span className="text-muted-foreground text-xs">(select or type)</span></Label>
                {selectedSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {selectedSkills.map((s) => (
                      <Badge key={s} variant="default" className="gap-1 cursor-pointer text-xs" onClick={() => toggleSkill(s)}>
                        {s} <X className="w-3 h-3" />
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 border rounded-md bg-muted/30">
                  {((allSkills as string[]) || []).filter((s) => !selectedSkills.includes(s)).map((skill) => (
                    <Badge key={skill} variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs" onClick={() => toggleSkill(skill)}>
                      {skill}
                    </Badge>
                  ))}
                </div>
                <Input
                  placeholder="Type a custom skill and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomSkill((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                />
                {form2.formState.errors.skills && (
                  <p className="text-sm text-destructive">{form2.formState.errors.skills.message}</p>
                )}
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label>Bio <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Textarea {...form2.register("bio")} placeholder="Tell us about your interests..." className="h-20" />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-1/3">← Back</Button>
                <Button type="submit" className="w-2/3" disabled={signup.isPending}>
                  {signup.isPending ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
