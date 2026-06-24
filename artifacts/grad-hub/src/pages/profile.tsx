import { useGetMe, useUpdateProfile, getGetMeQueryKey, useListMajors, useListSkillTags } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  major: z.string().min(1, "Major is required"),
  skills: z.array(z.string()).min(1, "Select at least one skill"),
  bio: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});

type ProfileData = z.infer<typeof profileSchema>;

export default function Profile() {
  const { data: me, isLoading } = useGetMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: majors = [] } = useListMajors();
  const { data: allSkills = [] } = useListSkillTags();

  const updateProfile = useUpdateProfile({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        toast({ title: "Profile updated successfully" });
      },
      onError: (err: any) => {
        toast({ title: "Update failed", description: err.message, variant: "destructive" });
      }
    }
  });

  const form = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", major: "", skills: [], bio: "", phone: "" }
  });

  useEffect(() => {
    if (me) {
      form.reset({
        name: me.name,
        major: me.major,
        skills: me.skills,
        bio: me.bio || "",
        phone: me.phone || ""
      });
    }
  }, [me, form]);

  if (isLoading) return <div>Loading profile...</div>;
  if (!me) return null;

  const onSubmit = (data: ProfileData) => {
    updateProfile.mutate({ id: me.id, data });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your public presence and contact info.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input {...form.register("name")} />
              {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Major</Label>
              <Select value={form.watch("major")} onValueChange={val => form.setValue("major", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select major" />
                </SelectTrigger>
                <SelectContent>
                  {majors.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea {...form.register("bio")} placeholder="Write a short bio about your interests..." className="h-32" />
            </div>

            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input {...form.register("phone")} placeholder="+20..." />
              <p className="text-xs text-muted-foreground">Only visible to connected users.</p>
            </div>

            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
