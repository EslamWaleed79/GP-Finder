import {
  useListProjects,
  useListUsers,
  useGetMe,
  useCreateApplication,
  useRespondConnection,
  useListConnections,
  getListProjectsQueryKey,
  getListUsersQueryKey,
  getListConnectionsQueryKey,
} from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const TRACKS = [
  "All",
  "Software Engineering",
  "Hardware Design",
  "Networks and Cybersecurity",
  "AI",
  "Embedded",
  "Other",
];

function trackBadgeText(track: string | null | undefined, customTrack: string | null | undefined): string {
  if (!track) return "Unknown";
  if (track === "Other") return customTrack || "Other";
  return track;
}

function statusVariant(status: string): "default" | "destructive" | "outline" {
  if (status === "open") return "default";
  if (status === "closed") return "destructive";
  return "outline";
}

export default function Dashboard() {
  const { data: me } = useGetMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [trackFilter, setTrackFilter] = useState("All");
  const [bylawFilter, setBylawFilter] = useState("All");
  const [genderFilter, setGenderFilter] = useState("All");
  const [projectTrackFilter, setProjectTrackFilter] = useState("All");
  const [appliedProjectIds, setAppliedProjectIds] = useState<number[]>([]);

  const { data: projects = [], isLoading: loadingProjects } = useListProjects({
    search: search || undefined,
    track: projectTrackFilter !== "All" ? projectTrackFilter : undefined,
  });

  const { data: users = [], isLoading: loadingUsers } = useListUsers({
    search: search || undefined,
    track: trackFilter !== "All" ? trackFilter : undefined,
  });

  const filteredUsers = users.filter((user) =>
    (bylawFilter === "All" || user.bylaw === bylawFilter) &&
    (genderFilter === "All" || user.gender === genderFilter)
  );

  const applyToProject = useCreateApplication({
    mutation: {
      onSuccess: (result) => {
        setAppliedProjectIds((ids) => [...new Set([...ids, result.projectId])]);
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        toast({ title: "Application submitted!" });
      },
      onError: (err: any) => {
        toast({ title: "Failed", description: err?.message || "Error submitting application", variant: "destructive" });
      },
    },
  });

  const respondConnection = useRespondConnection({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListConnectionsQueryKey() });
        toast({ title: "Connection request updated" });
      },
      onError: (err: any) => {
        toast({ title: "Unable to update request", description: err?.message || "Please try again", variant: "destructive" });
      },
    },
  });

  const { data: connectionData } = useListConnections();
  const incomingRequestMap = new Map<number, number>();
  connectionData?.incoming.forEach((req) => {
    incomingRequestMap.set(req.senderId, req.id);
  });

  const handleRespond = (requestId: number, status: "accepted" | "declined") => {
    respondConnection.mutate({ id: requestId, data: { status } });
  };

  // Sort: viewer's track first
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aMatch = a.track === me?.track ? 0 : 1;
    const bMatch = b.track === me?.track ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discover</h1>
          <p className="text-muted-foreground mt-1">
            Find your graduation project or recruit teammates.
          </p>
        </div>
        <div className="flex w-full md:w-auto gap-2">
          <Input
            placeholder="Search..."
            className="w-full md:w-[260px]"
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

        {/* ── Projects Tab ────────────────────────────────────────── */}
        <TabsContent value="projects" className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={projectTrackFilter} onValueChange={setProjectTrackFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Track" />
              </SelectTrigger>
              <SelectContent>
                {TRACKS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loadingProjects ? (
            <div>Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No projects found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Card key={project.id} className="transition-all border-border hover:shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-1">{project.title}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariant(project.status)} className="shrink-0 capitalize text-[10px]">
                          {project.status.replace("_", " ")}
                        </Badge>
                        {(project.isMember || me?.id === project.leaderId) && (
                          <Badge variant="secondary" className="shrink-0 text-[10px] bg-green-600 text-white">
                            {me?.id === project.leaderId ? "My Project" : "Joined"}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {project.track && (
                      <Badge variant="outline" className="w-fit text-[10px]">
                        {trackBadgeText(project.track, null)}
                      </Badge>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Leader: {project.leaderName ?? project.ownerName} •{" "}
                      {project.memberCount}/{project.maxMembers} members
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm line-clamp-2 text-muted-foreground mb-3">
                      {project.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {project.requiredSkills.slice(0, 4).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-[10px]">
                          {skill}
                        </Badge>
                      ))}
                      {project.requiredSkills.length > 4 && (
                        <Badge variant="secondary" className="text-[10px]">
                          +{project.requiredSkills.length - 4}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 text-xs" asChild>
                        <Link href={`/projects/${project.id}`}>View Details</Link>
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs"
                        disabled={
                          applyToProject.isPending ||
                          !project.canApply ||
                          project.isMember ||
                          project.status !== "open" ||
                          appliedProjectIds.includes(project.id)
                        }
                        onClick={() => applyToProject.mutate({ data: { projectId: project.id } })}
                      >
                        {appliedProjectIds.includes(project.id)
                          ? project.isMember
                            ? "Applied"
                            : "Pending"
                          : applyToProject.isPending
                          ? "Applying..."
                          : "Apply"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Students Tab ─────────────────────────────────────────── */}
        <TabsContent value="students" className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={trackFilter} onValueChange={setTrackFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Track" />
              </SelectTrigger>
              <SelectContent>
                {TRACKS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={bylawFilter} onValueChange={setBylawFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Bylaw" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Bylaws</SelectItem>
                <SelectItem value="2018">2018</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
              </SelectContent>
            </Select>

            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Genders</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loadingUsers ? (
            <div>Loading students...</div>
          ) : sortedUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No students found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedUsers
                .filter((u) => u.id !== me?.id)
                .map((user) => (
                  <Card key={user.id} className="transition-all border-border hover:shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg">{user.name}</CardTitle>
                        {user.track === me?.track && (
                          <Badge variant="default" className="text-[10px] shrink-0">Same track</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {user.track && (
                          <Badge variant="outline" className="text-[10px]">
                            {trackBadgeText(user.track, user.customTrack)}
                          </Badge>
                        )}
                        {user.bylaw && (
                          <Badge variant="outline" className="text-[10px]">Bylaw {user.bylaw}</Badge>
                        )}
                        {user.gender && (
                          <Badge variant="outline" className="text-[10px]">{user.gender}</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {user.bio && (
                        <p className="text-sm line-clamp-2 text-muted-foreground mb-3">
                          {user.bio.slice(0, 120)}{user.bio.length > 120 ? "…" : ""}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {user.skills.slice(0, 3).map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-[10px]">{skill}</Badge>
                        ))}
                        {user.skills.length > 3 && (
                          <Badge variant="secondary" className="text-[10px]">+{user.skills.length - 3}</Badge>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {user.connectStatus === "pending_received" ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="text-xs"
                              onClick={() => {
                                const requestId = incomingRequestMap.get(user.id);
                                if (requestId) handleRespond(requestId, "accepted");
                              }}
                              disabled={respondConnection.isPending || !incomingRequestMap.has(user.id)}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => {
                                const requestId = incomingRequestMap.get(user.id);
                                if (requestId) handleRespond(requestId, "declined");
                              }}
                              disabled={respondConnection.isPending || !incomingRequestMap.has(user.id)}
                            >
                              Ignore
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <Badge
                              variant={user.connectStatus === "connected" ? "default" : "outline"}
                              className="text-[10px]"
                            >
                              {user.connectStatus.replace("_", " ")}
                            </Badge>
                            <Button variant="ghost" size="sm" asChild className="text-xs">
                              <Link href={`/users/${user.id}`}>Profile</Link>
                            </Button>
                          </div>
                        )}
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
