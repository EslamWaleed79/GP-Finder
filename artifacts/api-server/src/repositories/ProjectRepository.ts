import { eq, ilike, or, sql, and } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  projectsTable,
  usersTable,
  type Project,
  type InsertProject,
} from "@workspace/db";

export class ProjectRepository {
  async findById(id: number): Promise<
    | (Project & { ownerName: string })
    | undefined
  > {
    const [row] = await db
      .select({
        id: projectsTable.id,
        title: projectsTable.title,
        description: projectsTable.description,
        requiredSkills: projectsTable.requiredSkills,
        status: projectsTable.status,
        ownerId: projectsTable.ownerId,
        ownerName: usersTable.name,
        teamSizeCap: projectsTable.teamSizeCap,
        createdAt: projectsTable.createdAt,
      })
      .from(projectsTable)
      .innerJoin(usersTable, eq(projectsTable.ownerId, usersTable.id))
      .where(eq(projectsTable.id, id));
    return row;
  }

  async create(data: InsertProject): Promise<Project & { ownerName: string }> {
    const [project] = await db.insert(projectsTable).values(data).returning();
    const owner = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, project!.ownerId))
      .limit(1);
    return { ...project!, ownerName: owner[0]?.name ?? "" };
  }

  async update(
    id: number,
    data: Partial<
      Pick<
        Project,
        "title" | "description" | "requiredSkills" | "status" | "teamSizeCap"
      >
    >
  ): Promise<(Project & { ownerName: string }) | undefined> {
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
    return { ...project, ownerName: owner[0]?.name ?? "" };
  }

  async delete(id: number): Promise<void> {
    await db.delete(projectsTable).where(eq(projectsTable.id, id));
  }

  async list(filters: {
    skills?: string[];
    status?: "open" | "in_progress" | "closed";
    search?: string;
  }): Promise<(Project & { ownerName: string })[]> {
    const conditions = [];

    if (filters.status) {
      conditions.push(eq(projectsTable.status, filters.status));
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
        ownerName: usersTable.name,
        teamSizeCap: projectsTable.teamSizeCap,
        createdAt: projectsTable.createdAt,
      })
      .from(projectsTable)
      .innerJoin(usersTable, eq(projectsTable.ownerId, usersTable.id))
      .where(whereClause);

    if (filters.skills && filters.skills.length > 0) {
      return rows.filter((p) =>
        filters.skills!.some((s) => p.requiredSkills.includes(s))
      );
    }

    return rows;
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
}
