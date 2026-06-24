import { useCreateProject, useUpdateProject, useGetProject, getGetProjectQueryKey, useListSkillTags } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";

const projectSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  requiredSkills: z.array(z.string()).min(1, "Select at least one skill"),
  teamSizeCap: z.coerce.number().min(1).max(20),
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
    query: { enabled: isEdit, queryKey: getGetProjectQueryKey(id!) }
  });

  const createProject = useCreateProject({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Project created" });
        setLocation(`/projects/${data.id}`);
      }
    }
  });

  const updateProject = useUpdateProject({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id!) });
        toast({ title: "Project updated" });
        setLocation(`/projects/${data.id}`);
      }
    }
  });

  const form = useForm<ProjectData>({
    resolver: zodResolver(projectSchema),
    defaultValues: { title: "", description: "", requiredSkills: [], teamSizeCap: 4, status: "open" }
  });

  useEffect(() => {
    if (isEdit && project) {
      form.reset({
        title: project.title,
        description: project.description,
        requiredSkills: project.requiredSkills,
        teamSizeCap: project.teamSizeCap,
        status: project.status
      });
    }
  }, [isEdit, project, form]);

  const onSubmit = (data: ProjectData) => {
    if (isEdit) {
      updateProject.mutate({ id: id!, data });
    } else {
      createProject.mutate({ data });
    }
  };

  const isPending = createProject.isPending || updateProject.isPending;

  if (isEdit && loadingProject) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{isEdit ? "Edit Project" : "Post a Project"}</h1>
        <p className="text-muted-foreground mt-1">
          {isEdit ? "Update your project details." : "Share your graduation project idea to find teammates."}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label>Project Title</Label>
              <Input {...form.register("title")} placeholder="e.g. Smart IoT Grid System" />
              {form.formState.errors.title && <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea {...form.register("description")} placeholder="Describe the project goals and what you want to achieve..." className="h-32" />
              {form.formState.errors.description && <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Team Size Cap</Label>
                <Input type="number" {...form.register("teamSizeCap")} min={1} max={20} />
                {form.formState.errors.teamSizeCap && <p className="text-sm text-destructive">{form.formState.errors.teamSizeCap.message}</p>}
              </div>

              {isEdit && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.watch("status")} onValueChange={val => form.setValue("status", val as any)}>
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

            {/* In a real app we'd use a multi-select component. Using a simpler approach for now to ensure it works */}
            <div className="space-y-2">
              <Label>Required Skills (comma separated)</Label>
              <Input 
                value={form.watch("requiredSkills").join(", ")} 
                onChange={e => {
                  const val = e.target.value;
                  form.setValue("requiredSkills", val ? val.split(",").map(s => s.trim()).filter(s => s.length > 0) : []);
                }}
                placeholder="React, Node.js, Python..."
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {form.watch("requiredSkills").map(skill => (
                  <Badge key={skill} variant="secondary">{skill}</Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setLocation(isEdit ? `/projects/${id}` : "/dashboard")}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : (isEdit ? "Save Changes" : "Create Project")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
