import {
  useGetUser,
  useSendConnection,
  getGetUserQueryKey,
  useGetMe,
} from "@workspace/api-client-react";
import { useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

function trackDisplay(track: string | null, customTrack: string | null): string {
  if (!track) return "";
  return track === "Other" ? customTrack ?? "Other" : track;
}

export default function UserDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const queryClient = useQueryClient();

  const { data: me } = useGetMe();
  const { data: user, isLoading } = useGetUser(id, {
    query: { enabled: !!id, queryKey: getGetUserQueryKey(id) },
  });

  const sendConnection = useSendConnection({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(id) });
      },
    },
  });

  if (isLoading) return <div>Loading user...</div>;
  if (!user) return <div>User not found</div>;

  const isSelf = me?.id === user.id;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
              <p className="text-lg text-muted-foreground mt-1">{user.major}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {user.track && (
                  <Badge variant="outline">{trackDisplay(user.track, user.customTrack)}</Badge>
                )}
                {user.bylaw && (
                  <Badge variant="outline">Bylaw {user.bylaw}</Badge>
                )}
                {user.gender && (
                  <Badge variant="outline">{user.gender}</Badge>
                )}
              </div>
            </div>
            {!isSelf && (
              <div className="flex items-center gap-2">
                {user.connectStatus === "none" && (
                  <Button
                    onClick={() => sendConnection.mutate({ data: { recipientId: user.id } })}
                    disabled={sendConnection.isPending}
                  >
                    {sendConnection.isPending ? "Connecting..." : "Connect"}
                  </Button>
                )}
                {user.connectStatus === "pending_sent" && (
                  <Badge variant="secondary" className="px-3 py-1">Pending Approval</Badge>
                )}
                {user.connectStatus === "pending_received" && (
                  <Badge variant="secondary" className="px-3 py-1">Pending (they sent request)</Badge>
                )}
                {user.connectStatus === "connected" && (
                  <Badge variant="default" className="px-3 py-1 bg-green-600 hover:bg-green-700">Connected</Badge>
                )}
              </div>
            )}
          </div>

          {user.bio && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">About</h3>
              <p className="text-muted-foreground">{user.bio}</p>
            </div>
          )}

          <div className="mb-6">
            <h3 className="font-semibold mb-2">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {user.skills.map((skill) => (
                <Badge key={skill} variant="outline">{skill}</Badge>
              ))}
            </div>
          </div>

          {/* Contact info — visible only when connected or self */}
          {(user.connectStatus === "connected" || isSelf) && (
            <div className="pt-6 border-t space-y-4">
              <h3 className="font-semibold">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <a href={`mailto:${user.email}`} className="text-primary hover:underline">{user.email}</a>
                  </div>
                )}
                {user.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <a href={`tel:${user.phone}`} className="text-primary hover:underline">{user.phone}</a>
                  </div>
                )}
                {user.gpa != null && (
                  <div>
                    <p className="text-sm text-muted-foreground">GPA</p>
                    <p className="font-medium">{user.gpa.toFixed(2)} / 4.00</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t text-sm text-muted-foreground">
            Joined {format(new Date(user.createdAt), "MMMM yyyy")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
