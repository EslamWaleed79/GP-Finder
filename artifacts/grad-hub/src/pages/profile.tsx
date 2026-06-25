import {
  useGetMe,
  useUpdateProfile,
  getGetMeQueryKey,
  useListSkillTags,
} from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const TRACKS = [
  "Software Engineering",
  "Hardware Design",
  "Networks and Cybersecurity",
  "AI",
  "Embedded",
  "Other",
] as const;

const EGYPTIAN_PHONE_RE = /^01[0-2,5]{1}[0-9]{8}$/;

const profileSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    track: z.enum(TRACKS, { required_error: "Track is required" }),
    customTrack: z.string().optional(),
    bylaw: z.enum(["2018", "2023"] as const, { required_error: "Bylaw is required" }),
    gender: z.enum(["Male", "Female"] as const, { required_error: "Gender is required" }),
    gpa: z.coerce
      .number()
      .min(0)
      .max(4.0, "GPA must be ≤ 4.0")
      .optional()
      .or(z.literal("" as any)),
    phone: z
      .string()
      .regex(EGYPTIAN_PHONE_RE, "Must be a valid Egyptian mobile number")
      .optional()
      .or(z.literal("")),
    skills: z.array(z.string()).min(1, "Select at least one skill"),
    bio: z.string().optional(),
  })
  .refine(
    (d) => d.track !== "Other" || (d.customTrack && d.customTrack.trim().length > 0),
    { message: "Custom track is required when track is 'Other'", path: ["customTrack"] }
  );

type ProfileData = z.infer<typeof profileSchema>;

export default function Profile() {
  const { data: me, isLoading } = useGetMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: allSkills = [] } = useListSkillTags();

  const updateProfile = useUpdateProfile({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        toast({ title: "Profile updated successfully" });
      },
      onError: (err: any) => {
        toast({ title: "Update failed", description: err?.message, variant: "destructive" });
      },
    },
  });

  const form = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
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

  useEffect(() => {
    if (me) {
      form.reset({
        name: me.name,
        track: (me.track as any) ?? undefined,
        customTrack: me.customTrack ?? "",
        bylaw: (me.bylaw as any) ?? undefined,
        gender: (me.gender as any) ?? undefined,
        gpa: me.gpa ?? undefined,
        phone: me.phone ?? "",
        skills: me.skills ?? [],
        bio: me.bio ?? "",
      });
    }
  }, [me]);

  if (isLoading) return <div>Loading profile...</div>;
  if (!me) return null;

  const onSubmit = (data: ProfileData) => {
    updateProfile.mutate({
      id: me.id,
      data: {
        name: data.name,
        track: data.track as any,
        customTrack: data.track === "Other" ? data.customTrack ?? null : null,
        bylaw: data.bylaw,
        gender: data.gender,
        gpa: data.gpa ? Number(data.gpa) : null,
        phone: data.phone || null,
        skills: data.skills,
        bio: data.bio || null,
      },
    });
  };

  const selectedSkills = form.watch("skills");
  const watchTrack = form.watch("track");

  const toggleSkill = (skill: string) => {
    const current = form.getValues("skills");
    if (current.includes(skill)) {
      form.setValue("skills", current.filter((s) => s !== skill), { shouldValidate: true });
    } else {
      form.setValue("skills", [...current, skill], { shouldValidate: true });
    }
  };

  const addCustomSkill = (raw: string) => {
    const skill = raw.trim();
    if (!skill) return;
    const current = form.getValues("skills");
    if (!current.includes(skill)) {
      form.setValue("skills", [...current, skill], { shouldValidate: true });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
        <p className="text-muted-foreground mt-1">
          Manage your public presence. Phone and GPA are only visible to connected users.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* Track */}
            <div className="space-y-2">
              <Label>Track</Label>
              <Select
                value={form.watch("track") ?? ""}
                onValueChange={(v) => form.setValue("track", v as any, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Select track" /></SelectTrigger>
                <SelectContent>
                  {TRACKS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.formState.errors.track && (
                <p className="text-sm text-destructive">{form.formState.errors.track.message}</p>
              )}
            </div>
            {watchTrack === "Other" && (
              <div className="space-y-2">
                <Label>Specify Track</Label>
                <Input {...form.register("customTrack")} placeholder="e.g. Biomedical Engineering" />
                {form.formState.errors.customTrack && (
                  <p className="text-sm text-destructive">{form.formState.errors.customTrack.message}</p>
                )}
              </div>
            )}

            {/* Bylaw + Gender */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bylaw</Label>
                <Select
                  value={form.watch("bylaw") ?? ""}
                  onValueChange={(v) => form.setValue("bylaw", v as any, { shouldValidate: true })}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2018">2018</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.bylaw && (
                  <p className="text-sm text-destructive">{form.formState.errors.bylaw.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={form.watch("gender") ?? ""}
                  onValueChange={(v) => form.setValue("gender", v as any, { shouldValidate: true })}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.gender && (
                  <p className="text-sm text-destructive">{form.formState.errors.gender.message}</p>
                )}
              </div>
            </div>

            {/* GPA + Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>GPA <span className="text-muted-foreground text-xs">(private)</span></Label>
                <Input type="number" step="0.01" min="0" max="4" {...form.register("gpa")} placeholder="3.5" />
                {form.formState.errors.gpa && (
                  <p className="text-sm text-destructive">{form.formState.errors.gpa.message as string}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Phone <span className="text-muted-foreground text-xs">(private)</span></Label>
                <Input {...form.register("phone")} placeholder="01012345678" />
                {form.formState.errors.phone && (
                  <p className="text-sm text-destructive">{form.formState.errors.phone.message as string}</p>
                )}
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <Label>Skills</Label>
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
              {form.formState.errors.skills && (
                <p className="text-sm text-destructive">{form.formState.errors.skills.message}</p>
              )}
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea {...form.register("bio")} placeholder="Write a short bio about your interests..." className="h-28" />
            </div>

            <div className="flex items-center gap-4">
              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <div className="text-xs text-muted-foreground">
                Email: <span className="font-medium">{me.email}</span>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
