import { useListConnections, useRespondConnection, useListUsers, getListConnectionsQueryKey, getListUsersQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

export default function Connections() {
  const { data, isLoading } = useListConnections();
  const { data: connectedUsers = [] } = useListUsers({ connectionStatus: "connected" });
  const queryClient = useQueryClient();
  const respond = useRespondConnection({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListConnectionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey({ connectionStatus: "connected" }) });
      },
    },
  });

  const handleRespond = (id: number, status: "accepted" | "declined") => {
    respond.mutate({ id, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListConnectionsQueryKey() });
      }
    });
  };

  if (isLoading) return <div>Loading connections...</div>;

  const incoming = data?.incoming || [];
  const outgoing = data?.outgoing || [];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Connections</h1>
        <p className="text-muted-foreground mt-1">Manage your team requests and invitations.</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Incoming Requests</h2>
        {incoming.length === 0 ? (
          <p className="text-muted-foreground text-sm">No pending incoming requests.</p>
        ) : (
          <div className="grid gap-3">
            {incoming.map(req => (
              <Card key={req.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{req.senderName}</p>
                    <p className="text-sm text-muted-foreground">
                      Requested to connect {req.projectTitle ? `for project: ${req.projectTitle}` : ''}
                    </p>
                  </div>
                  {req.status === 'pending' ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleRespond(req.id, "accepted")} disabled={respond.isPending}>
                        <Check className="w-4 h-4 mr-1" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleRespond(req.id, "declined")} disabled={respond.isPending}>
                        <X className="w-4 h-4 mr-1" /> Decline
                      </Button>
                    </div>
                  ) : (
                    <Badge variant={req.status === 'accepted' ? 'default' : 'secondary'}>{req.status}</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Outgoing Requests</h2>
        {outgoing.length === 0 ? (
          <p className="text-muted-foreground text-sm">No outgoing requests.</p>
        ) : (
          <div className="grid gap-3">
            {outgoing.map(req => (
              <Card key={req.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">To: {req.recipientName}</p>
                    {req.projectTitle && <p className="text-sm text-muted-foreground">Project: {req.projectTitle}</p>}
                  </div>
                  <Badge variant={req.status === 'accepted' ? 'default' : 'secondary'}>{req.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Your Connections</h2>
        {connectedUsers.length === 0 ? (
          <p className="text-muted-foreground text-sm">No connections yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connectedUsers.map((user) => (
              <Card key={user.id} className="transition-all border-border hover:shadow-md">
                <CardContent>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg mb-1">{user.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{user.major}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {user.skills.slice(0, 4).map((skill) => (
                          <Badge key={skill} variant="outline" className="text-[10px]">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild className="text-xs">
                      <Link href={`/users/${user.id}`}>Profile</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
