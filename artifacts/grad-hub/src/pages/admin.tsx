import { useAdminListUsers, useAdminListProjects, useAdminDeleteUser, useAdminDeleteProject, getAdminListUsersQueryKey, getAdminListProjectsQueryKey } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function Admin() {
  const { data: users = [], isLoading: loadingUsers } = useAdminListUsers();
  const { data: projects = [], isLoading: loadingProjects } = useAdminListProjects();
  const queryClient = useQueryClient();

  const deleteUser = useAdminDeleteUser({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() })
    }
  });

  const deleteProject = useAdminDeleteProject({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getAdminListProjectsQueryKey() })
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage platform users and projects.</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
          <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {loadingUsers ? <div>Loading...</div> : (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr className="text-left">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Email</th>
                    <th className="p-3 font-medium">Role</th>
                    <th className="p-3 font-medium">Joined</th>
                    <th className="p-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-3">{u.name}</td>
                      <td className="p-3">{u.email}</td>
                      <td className="p-3">{u.role}</td>
                      <td className="p-3">{format(new Date(u.createdAt), 'PP')}</td>
                      <td className="p-3 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => { if(confirm("Are you sure?")) deleteUser.mutate({ id: u.id }) }}
                          disabled={u.role === 'admin' || deleteUser.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          {loadingProjects ? <div>Loading...</div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map(p => (
                <Card key={p.id}>
                  <CardHeader className="pb-2 flex flex-row items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{p.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">Owner ID: {p.ownerId}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive h-8 w-8 hover:bg-destructive/10"
                      onClick={() => { if(confirm("Are you sure?")) deleteProject.mutate({ id: p.id }) }}
                      disabled={deleteProject.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm line-clamp-2 text-muted-foreground">{p.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
