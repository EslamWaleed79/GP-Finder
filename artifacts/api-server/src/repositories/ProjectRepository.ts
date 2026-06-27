import { eq, ilike, or, sql, and } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  projectsTable,
  usersTable,
  projectApplicationsTable,
  type Project,
  type InsertProject,
} from "@workspace/db";

export type ProjectWithMeta = Project & {
  ownerName: string;
  leaderName: string | null;
  memberCount: number;
};

export class ProjectRepository {
  async findById(id: number): Promise<ProjectWithMeta | undefined> {
    const [row] = await db
      .select({
        id: projectsTable.id,
        title: projectsTable.title,
        description: projectsTable.description,
        requiredSkills: projectsTable.requiredSkills,
        status: projectsTable.status,
        ownerId: projectsTable.ownerId,
        leaderId: projectsTable.leaderId,
        track: projectsTable.track,
        ownerName: usersTable.name,
        teamSizeCap: projectsTable.teamSizeCap,
        maxMembers: projectsTable.maxMembers,
        createdAt: projectsTable.createdAt,
      })
      .from(projectsTable)
      .innerJoin(usersTable, eq(projectsTable.ownerId, usersTable.id))
      .where(eq(projectsTable.id, id));
    if (!row) return undefined;

    const leaderRow = row.leaderId
      ? await db
          .select({ name: usersTable.name })
          .from(usersTable)
          .where(eq(usersTable.id, row.leaderId))
          .limit(1)
      : [];

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(projectApplicationsTable)
      .where(
        and(
          eq(projectApplicationsTable.projectId, id),
          eq(projectApplicationsTable.status, "accepted")
        )
      );

    return {
      ...row,
      leaderName: leaderRow[0]?.name ?? null,
      memberCount: Number(count),
    };
  }

  async create(data: InsertProject): Promise<ProjectWithMeta> {
    const [project] = await db.insert(projectsTable).values(data).returning();
    const owner = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, project!.ownerId))
      .limit(1);
    return {
      ...project!,
      ownerName: owner[0]?.name ?? "",
      leaderName: owner[0]?.name ?? null,
      memberCount: 0,
    };
  }

  async update(
    id: number,
    data: Partial<
      Pick<
        Project,
        | "title"
        | "description"
        | "requiredSkills"
        | "status"
        | "teamSizeCap"
        | "maxMembers"
        | "track"
        | "leaderId"
      >
    >
  ): Promise<ProjectWithMeta | undefined> {
    const [project] = await db
      .update(projectsTable)
      .set(data)
      .where(eq(projectsTable.id, id))
      .returning();
    if (!project) return undefined;
    const owner = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, project.ownerId))
      .limit(1);
    const leaderRow = project.leaderId
      ? await db
          .select({ name: usersTable.name })
          .from(usersTable)
          .where(eq(usersTable.id, project.leaderId))
          .limit(1)
      : [];
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(projectApplicationsTable)
      .where(
        and(
          eq(projectApplicationsTable.projectId, id),
          eq(projectApplicationsTable.status, "accepted")
        )
      );
    return {
      ...project,
      ownerName: owner[0]?.name ?? "",
      leaderName: leaderRow[0]?.name ?? null,
      memberCount: Number(count),
    };
  }

  async delete(id: number): Promise<void> {
    await db.delete(projectsTable).where(eq(projectsTable.id, id));
  }

  async list(filters: {
    skills?: string[];
    status?: "open" | "closed";
    search?: string;
    track?: string;
  }): Promise<ProjectWithMeta[]> {
    const conditions = [];

    if (filters.status) {
      conditions.push(eq(projectsTable.status, filters.status));
    }
    if (filters.track) {
      conditions.push(eq(projectsTable.track, filters.track as any));
    }
    if (filters.search) {
      conditions.push(
        or(
          ilike(projectsTable.title, `%${filters.search}%`),
          ilike(projectsTable.description, `%${filters.search}%`)
        )
      );
    }

    const whereClause =
      conditions.length === 0
        ? undefined
        : conditions.length === 1
          ? conditions[0]
          : and(...conditions);

    const rows = await db
      .select({
        id: projectsTable.id,
        title: projectsTable.title,
        description: projectsTable.description,
        requiredSkills: projectsTable.requiredSkills,
        status: projectsTable.status,
        ownerId: projectsTable.ownerId,
        leaderId: projectsTable.leaderId,
        track: projectsTable.track,
        ownerName: usersTable.name,
        teamSizeCap: projectsTable.teamSizeCap,
        maxMembers: projectsTable.maxMembers,
        createdAt: projectsTable.createdAt,
      })
      .from(projectsTable)
      .innerJoin(usersTable, eq(projectsTable.ownerId, usersTable.id))
      .where(whereClause);

    let result = rows;
    if (filters.skills && filters.skills.length > 0) {
      result = rows.filter((p) =>
        filters.skills!.some((s) => p.requiredSkills.includes(s))
      );
    }

    // Enrich with member counts
    const enriched = await Promise.all(
      result.map(async (p) => {
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(projectApplicationsTable)
          .where(
            and(
              eq(projectApplicationsTable.projectId, p.id),
              eq(projectApplicationsTable.status, "accepted")
            )
          );
        const leaderRow = p.leaderId
          ? await db
              .select({ name: usersTable.name })
              .from(usersTable)
              .where(eq(usersTable.id, p.leaderId))
              .limit(1)
          : [];
        return {
          ...p,
          leaderName: leaderRow[0]?.name ?? p.ownerName,
          memberCount: Number(count),
        };
      })
    );
    return enriched;
  }

  async countOpen(): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(projectsTable)
      .where(eq(projectsTable.status, "open"));
    return Number(row?.count ?? 0);
  }

  async countByOwner(ownerId: number): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(projectsTable)
      .where(eq(projectsTable.ownerId, ownerId));
    return Number(row?.count ?? 0);
  }

  async findByLeader(leaderId: number): Promise<Project | undefined> {
    const [row] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.leaderId, leaderId))
      .limit(1);
    return row;
  }
}
