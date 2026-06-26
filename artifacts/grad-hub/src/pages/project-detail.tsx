import {
  useGetProject,
  useDeleteProject,
  useApplyToProject,
  useListProjectApplications,
  useDecideApplication,
  useLeaveProject,
  useUpdateProjectStatus,
  getGetProjectQueryKey,
  getListProjectApplicationsQueryKey,
  getListProjectsQueryKey,
  useGetMe,
} from "@workspace/api-client-react";
import { useParams, useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { ProjectApplicationWithApplicant } from "@workspace/api-client-react";

function trackBadgeText(track: string | null): string {
  if (!track) return "";
  return track;
}

export default function ProjectDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: me } = useGetMe();
  const { data: project, isLoading } = useGetProject(id, {
    query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) },
  });

  const isLeader = me?.id === project?.leaderId;
  const isMember = Boolean(project?.isMember);

  const { data: applications = [] } = useListProjectApplications(id, {
    query: { enabled: !!id && isLeader },
  });

  const deleteProject = useDeleteProject({
    mutation: { onSuccess: () => setLocation("/dashboard") },
  });

  const applyToProject = useApplyToProject({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
        toast({ title: "Application submitted!" });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err?.message, variant: "destructive" });
      },
    },
  });

  const decideApplication = useDecideApplication({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListProjectApplicationsQueryKey(id) });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err?.message, variant: "destructive" });
      },
    },
  });

  const leaveProject = useLeaveProject({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        toast({ title: "You left the project" });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err?.message, variant: "destructive" });
      },
    },
  });

  const updateProjectStatus = useUpdateProjectStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
        toast({ title: "Project status updated" });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err?.message, variant: "destructive" });
      },
    },
  });

  if (isLoading) return <div>Loading project...</div>;
  if (!project) return <div>Project not found</div>;

  const statusVariant = (s: string) =>
    s === "open" ? "default" : s === "in_progress" ? "secondary" : "outline";

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.title}</h1>
          <p className="text-muted-foreground mt-2">
            Leader:{" "}
            <Link href={`/users/${project.leaderId ?? project.ownerId}`} className="text-primary hover:underline">
              {project.leaderName ?? project.ownerName}
            </Link>{" "}
            • {format(new Date(project.createdAt), "PP")}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant={statusVariant(project.status) as any} className="capitalize">
              {project.status.replace("_", " ")}
            </Badge>
            {(isMember || isLeader) && (
              <Badge variant="secondary" className="bg-green-600 text-white">
                {isLeader ? "My Project" : "Joined"}
              </Badge>
            )}
            {project.track && (
              <Badge variant="outline">{trackBadgeText(project.track)}</Badge>
            )}
            <Badge variant="outline">
              {project.memberCount}/{project.maxMembers} members
            </Badge>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {isLeader ? (
            <>
              <Button variant="outline" asChild>
                <Link href={`/projects/${id}/edit`}>Edit</Link>
              </Button>
              {project.status !== "closed" && (
                <Button
                  variant="outline"
                  onClick={() => updateProjectStatus.mutate({ id, data: { status: "closed" } })}
                  disabled={updateProjectStatus.isPending}
                >
                  {updateProjectStatus.isPending ? "Closing..." : "Close Project"}
                </Button>
              )}
              <Button
                variant="destructive"
                onClick={() => { if (confirm("Delete this project?")) deleteProject.mutate({ id }); }}
                disabled={deleteProject.isPending}
              >
                Delete
              </Button>
            </>
          ) : (
            <>
              {isMember && !isLeader && (
                <Button
                  variant="destructive"
                  onClick={() => leaveProject.mutate({ id })}
                  disabled={leaveProject.isPending}
                >
                  {leaveProject.isPending ? "Leaving..." : "Leave Project"}
                </Button>
              )}
              {project.canApply && (
                <Button
                  onClick={() => applyToProject.mutate({ data: { projectId: project.id } })}
                  disabled={applyToProject.isPending}
                >
                  {applyToProject.isPending ? "Applying..." : "Apply to Join"}
                </Button>
              )}
              {project.status !== "open" && !project.canApply && me?.id !== project.leaderId && (
                <Badge variant="secondary" className="px-4 py-2 text-sm">
                  {project.status === "closed" ? "Closed" : "In Progress"}
                </Badge>
              )}
            </>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{project.description}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Required Skills</h3>
            <div className="flex flex-wrap gap-2">
              {project.requiredSkills.map((skill) => (
                <Badge key={skill} variant="outline">{skill}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Applications Panel (leader only) ──────────────────── */}
      {isLeader && (
        <Card>
          <CardHeader>
            <CardTitle>Applications ({applications.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {applications.length === 0 ? (
              <p className="text-muted-foreground text-sm">No applications yet.</p>
            ) : (
              applications.map((app) => (
                <ApplicationRow
                  key={app.id}
                  app={app}
                  onDecide={(action) =>
                    decideApplication.mutate({ id: app.id, data: { action } })
                  }
                  isPending={decideApplication.isPending}
                />
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ApplicationRow({
  app,
  onDecide,
  isPending,
}: {
  app: ProjectApplicationWithApplicant;
  onDecide: (action: "accepted" | "rejected" | "removed") => void;
  isPending: boolean;
}) {
  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    accepted: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    left: "bg-gray-100 text-gray-600",
    removed: "bg-red-50 text-red-500",
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-3 border rounded-lg">
      <div className="space-y-1 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/users/${app.applicantId}`} className="font-medium hover:underline text-primary">
            {app.applicantName}
          </Link>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[app.status] ?? ""}`}>
            {app.status}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {app.applicantTrack && (
            <Badge variant="outline" className="text-[10px]">
              {app.applicantTrack === "Other" ? app.applicantCustomTrack ?? "Other" : app.applicantTrack}
            </Badge>
          )}
          {app.applicantBylaw && (
            <Badge variant="outline" className="text-[10px]">Bylaw {app.applicantBylaw}</Badge>
          )}
          {app.applicantGender && (
            <Badge variant="outline" className="text-[10px]">{app.applicantGender}</Badge>
          )}
        </div>
        {app.applicantBio && (
          <p className="text-xs text-muted-foreground line-clamp-2">{app.applicantBio}</p>
        )}
        <div className="flex flex-wrap gap-1">
          {app.applicantSkills.slice(0, 4).map((s) => (
            <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
          ))}
          {app.applicantSkills.length > 4 && (
            <Badge variant="secondary" className="text-[10px]">+{app.applicantSkills.length - 4}</Badge>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Applied {format(new Date(app.requestedAt), "PP")}
        </p>
      </div>

      <div className="flex gap-2 shrink-0">
        {app.status === "pending" && (
          <>
            <Button size="sm" variant="default" disabled={isPending} onClick={() => onDecide("accepted")} className="text-xs">
              Accept
            </Button>
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => onDecide("rejected")} className="text-xs">
              Reject
            </Button>
          </>
        )}
        {app.status === "accepted" && (
          <Button size="sm" variant="destructive" disabled={isPending} onClick={() => onDecide("removed")} className="text-xs">
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
