import { useListNotifications, useMarkNotificationRead, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function Notifications() {
  const { data: notifications = [], isLoading } = useListNotifications({
    query: {
      queryKey: getListNotificationsQueryKey(),
      refetchInterval: 10000,
      refetchIntervalInBackground: false,
    },
  });
  const queryClient = useQueryClient();
  const markRead = useMarkNotificationRead();

  const handleMarkRead = (id: number) => {
    markRead.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      }
    });
  };

  if (isLoading) return <div>Loading notifications...</div>;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground mt-1">Stay updated on your connections and projects.</p>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">You're all caught up!</div>
      ) : (
        <div className="space-y-4">
          {notifications.map(n => {
            const match = n.message.match(/^connection_request:(\d+):(.+)$/);
            const userId = match ? parseInt(match[1], 10) : undefined;
            const message = match ? match[2] : n.message;
            const href = userId ? `/users/${userId}` : "/notifications";

            return (
              <Link key={n.id} href={href} className="block">
                <Card 
                  className={`transition-colors cursor-pointer ${n.read ? 'bg-muted/30' : 'border-primary/50'}`}
                  onClick={() => !n.read && handleMarkRead(n.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className={n.read ? "text-muted-foreground" : "font-medium text-foreground"}>{message}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(n.createdAt), 'PP p')}</p>
                    </div>
                    {!n.read && <Badge>Unread</Badge>}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
