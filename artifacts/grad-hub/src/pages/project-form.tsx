import {
  useCreateProject,
  useUpdateProject,
  useGetProject,
  getGetProjectQueryKey,
  useListSkillTags,
} from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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

const projectSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  track: z.enum(TRACKS, { required_error: "Track is required" }),
  requiredSkills: z.array(z.string()).min(1, "Select at least one skill"),
  maxMembers: z.coerce.number().min(1).max(20),
  status: z.enum(["open", "in_progress", "closed"]).optional(),
});

type ProjectData = z.infer<typeof projectSchema>;

export default function ProjectForm() {
  const [_, setLocation] = useLocation();
  const params = useParams();
  const id = params.id ? parseInt(params.id, 10) : undefined;
  const isEdit = !!id;

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: allSkills = [] } = useListSkillTags();

  const { data: project, isLoading: loadingProject } = useGetProject(id!, {
    query: { enabled: isEdit, queryKey: getGetProjectQueryKey(id!) },
  });

  const createProject = useCreateProject({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Project created" });
        setLocation(`/projects/${data.id}`);
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err?.message, variant: "destructive" });
      },
    },
  });

  const updateProject = useUpdateProject({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id!) });
        toast({ title: "Project updated" });
        setLocation(`/projects/${data.id}`);
      },
    },
  });

  const form = useForm<ProjectData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: "",
      description: "",
      track: undefined,
      requiredSkills: [],
      maxMembers: 5,
      status: "open",
    },
  });

  useEffect(() => {
    if (isEdit && project) {
      form.reset({
        title: project.title,
        description: project.description,
        track: (project.track as any) ?? undefined,
        requiredSkills: project.requiredSkills,
        maxMembers: project.maxMembers,
        status: project.status,
      });
    }
  }, [isEdit, project, form]);

  const onSubmit = (data: ProjectData) => {
    if (isEdit) {
      updateProject.mutate({ id: id!, data });
    } else {
      createProject.mutate({ data: { ...data, teamSizeCap: data.maxMembers } });
    }
  };

  const isPending = createProject.isPending || updateProject.isPending;
  if (isEdit && loadingProject) return <div>Loading...</div>;

  const selectedSkills = form.watch("requiredSkills");

  const toggleSkill = (skill: string) => {
    const current = form.getValues("requiredSkills");
    if (current.includes(skill)) {
      form.setValue("requiredSkills", current.filter((s) => s !== skill), { shouldValidate: true });
    } else {
      form.setValue("requiredSkills", [...current, skill], { shouldValidate: true });
    }
  };

  const addCustomSkill = (raw: string) => {
    const skill = raw.trim();
    if (!skill) return;
    const current = form.getValues("requiredSkills");
    if (!current.includes(skill)) {
      form.setValue("requiredSkills", [...current, skill], { shouldValidate: true });
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {isEdit ? "Edit Project" : "Post a Project"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isEdit
            ? "Update your project details."
            : "Share your graduation project idea to find teammates."}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label>Project Title</Label>
              <Input {...form.register("title")} placeholder="e.g. Smart IoT Grid System" />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                {...form.register("description")}
                placeholder="Describe the project goals and what you want to achieve..."
                className="h-32"
              />
              {form.formState.errors.description && (
                <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>

            {/* Track */}
            <div className="space-y-2">
              <Label>Track</Label>
              <Select
                value={form.watch("track") ?? ""}
                onValueChange={(v) => form.setValue("track", v as any, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project track" />
                </SelectTrigger>
                <SelectContent>
                  {TRACKS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.track && (
                <p className="text-sm text-destructive">{form.formState.errors.track.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Members</Label>
                <Input
                  type="number"
                  {...form.register("maxMembers")}
                  min={1}
                  max={20}
                />
                {form.formState.errors.maxMembers && (
                  <p className="text-sm text-destructive">{form.formState.errors.maxMembers.message}</p>
                )}
              </div>

              {isEdit && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.watch("status")}
                    onValueChange={(v) => form.setValue("status", v as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Required Skills */}
            <div className="space-y-2">
              <Label>Required Skills</Label>
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
                {(allSkills as string[]).filter((s) => !selectedSkills.includes(s)).map((skill) => (
                  <Badge
                    key={skill}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                    onClick={() => toggleSkill(skill)}
                  >
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
              {form.formState.errors.requiredSkills && (
                <p className="text-sm text-destructive">{form.formState.errors.requiredSkills.message}</p>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation(isEdit ? `/projects/${id}` : "/dashboard")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Project"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
