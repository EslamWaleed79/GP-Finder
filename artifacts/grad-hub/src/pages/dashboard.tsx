import { useListProjects, useListUsers, useGetMe } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: me } = useGetMe();
  const [search, setSearch] = useState("");
  
  const { data: projects = [], isLoading: loadingProjects } = useListProjects({ search: search || undefined });
  const { data: users = [], isLoading: loadingUsers } = useListUsers({ search: search || undefined });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discover</h1>
          <p className="text-muted-foreground mt-1">Find your graduation project or recruit teammates.</p>
        </div>
        <div className="flex w-full md:w-auto gap-2">
          <Input 
            placeholder="Search..." 
            className="w-full md:w-[300px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button asChild>
            <Link href="/projects/new">Post Project</Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="projects" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
        </TabsList>
        
        <TabsContent value="projects" className="space-y-4">
          {loadingProjects ? (
            <div>Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No projects found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Card key={project.id} className="hover-elevate transition-all border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl line-clamp-1">{project.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">By {project.ownerName} • Cap: {project.teamSizeCap}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm line-clamp-2 text-muted-foreground mb-4">{project.description}</p>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {project.requiredSkills.map(skill => (
                        <Badge key={skill} variant="secondary" className="text-[10px]">{skill}</Badge>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full" asChild>
                      <Link href={`/projects/${project.id}`}>View Details</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="students" className="space-y-4">
          {loadingUsers ? (
            <div>Loading students...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No students found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.filter(u => u.id !== me?.id).map((user) => (
                <Card key={user.id} className="hover-elevate transition-all border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl">{user.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{user.major}</p>
                  </CardHeader>
                  <CardContent>
                    {user.bio && <p className="text-sm line-clamp-2 text-muted-foreground mb-4">{user.bio}</p>}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {user.skills.map(skill => (
                        <Badge key={skill} variant="secondary" className="text-[10px]">{skill}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant={user.connectStatus === 'connected' ? 'default' : 'outline'}>
                        {user.connectStatus.replace('_', ' ')}
                      </Badge>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/users/${user.id}`}>Profile</Link>
                      </Button>
                    </div>
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
