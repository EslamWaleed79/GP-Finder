import { useGetProject, useDeleteProject, useSendConnection, getGetProjectQueryKey } from "@workspace/api-client-react";
import { useParams, useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetMe } from "@workspace/api-client-react";
import { format } from "date-fns";

export default function ProjectDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: me } = useGetMe();
  const { data: project, isLoading } = useGetProject(id, {
    query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) }
  });

  const deleteProject = useDeleteProject({
    mutation: {
      onSuccess: () => {
        setLocation("/dashboard");
      }
    }
  });

  const sendConnection = useSendConnection({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
      }
    }
  });

  if (isLoading) return <div>Loading project...</div>;
  if (!project) return <div>Project not found</div>;

  const isOwner = me?.id === project.ownerId;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.title}</h1>
          <p className="text-muted-foreground mt-2">Posted by <Link href={`/users/${project.ownerId}`} className="text-primary hover:underline">{project.ownerName}</Link> • {format(new Date(project.createdAt), 'PP')}</p>
        </div>
        <div className="flex gap-2">
          {isOwner ? (
            <>
              <Button variant="outline" asChild>
                <Link href={`/projects/${id}/edit`}>Edit</Link>
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => { if(confirm("Are you sure?")) deleteProject.mutate({ id }) }}
                disabled={deleteProject.isPending}
              >
                Delete
              </Button>
            </>
          ) : (
            <>
              {project.connectStatus === "none" && (
                <Button 
                  onClick={() => sendConnection.mutate({ data: { recipientId: project.ownerId, projectId: project.id } })}
                  disabled={sendConnection.isPending}
                >
                  {sendConnection.isPending ? "Connecting..." : "Request to Join"}
                </Button>
              )}
              {project.connectStatus === "pending_sent" && (
                <Badge variant="secondary" className="text-sm px-4 py-2">Pending Approval</Badge>
              )}
              {project.connectStatus === "connected" && (
                <Badge variant="default" className="text-sm px-4 py-2 bg-green-600 hover:bg-green-700">Connected</Badge>
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
              {project.requiredSkills.map(skill => (
                <Badge key={skill} variant="outline">{skill}</Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <Badge variant={project.status === 'open' ? 'default' : 'secondary'}>{project.status.replace('_', ' ')}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Team Size Cap</p>
              <p className="font-medium">{project.teamSizeCap} members</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
