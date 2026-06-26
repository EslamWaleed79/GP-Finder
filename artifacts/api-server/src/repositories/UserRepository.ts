import { eq, ilike, or, sql, and } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  connectRequestsTable,
  type User,
  type InsertUser,
} from "@workspace/db";

export class UserRepository {
  async findById(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id));
    return user;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    console.log("Busting build cache to enforce postgres.js driver!");
    try {
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email));
      return user;
    } catch (error: any) {
      // Unmasks the raw Postgres driver error
      console.error("🚨 DATABASE ERROR in findByEmail:", {
        message: error.message,
        code: error.code,       // This is the crucial part (e.g., '42P01', '28000')
        detail: error.detail,
        routine: error.routine
      });
      throw error;
    }
  }

  async create(data: InsertUser): Promise<User> {
    try {
      const [user] = await db.insert(usersTable).values(data).returning();
      return user!;
    } catch (error: any) {
      console.error("🚨 DATABASE ERROR in create:", {
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
      throw error;
    }
  }

  async update(
    id: number,
    data: Partial<
      Pick<
        User,
        | "name"
        | "major"
        | "skills"
        | "bio"
        | "phone"
        | "gpa"
        | "bylaw"
        | "track"
        | "customTrack"
        | "gender"
        | "cvLink"
      >
    >
  ): Promise<User | undefined> {
    const [user] = await db
      .update(usersTable)
      .set(data)
      .where(eq(usersTable.id, id))
      .returning();
    return user;
  }

  async delete(id: number): Promise<void> {
    await db.delete(usersTable).where(eq(usersTable.id, id));
  }

  async list(filters: {
    skills?: string[];
    major?: string;
    search?: string;
    track?: string;
    bylaw?: string;
    gender?: string;
  }): Promise<User[]> {
    const conditions = [];

    if (filters.major) {
      conditions.push(ilike(usersTable.major, `%${filters.major}%`));
    }
    if (filters.track) {
      conditions.push(eq(usersTable.track, filters.track as any));
    }
    if (filters.bylaw) {
      conditions.push(eq(usersTable.bylaw, filters.bylaw as any));
    }
    if (filters.gender) {
      conditions.push(eq(usersTable.gender, filters.gender as any));
    }
    if (filters.search) {
      conditions.push(
        or(
          ilike(usersTable.name, `%${filters.search}%`),
          ilike(usersTable.bio, `%${filters.search}%`)
        )
      );
    }

    const whereClause =
      conditions.length === 0
        ? undefined
        : conditions.length === 1
          ? conditions[0]
          : and(...conditions);

    const users = whereClause
      ? await db.select().from(usersTable).where(whereClause)
      : await db.select().from(usersTable);

    if (filters.skills && filters.skills.length > 0) {
      return users.filter((u) =>
        filters.skills!.some((s) => u.skills.includes(s))
      );
    }

    return users;
  }

  async count(): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(usersTable);
    return Number(row?.count ?? 0);
  }

  async getConnectionStatus(
    viewerId: number,
    targetId: number
  ): Promise<"none" | "pending_sent" | "pending_received" | "connected"> {
    if (viewerId === targetId) return "none";

    const [req] = await db
      .select()
      .from(connectRequestsTable)
      .where(
        or(
          sql`${connectRequestsTable.senderId} = ${viewerId} AND ${connectRequestsTable.recipientId} = ${targetId}`,
          sql`${connectRequestsTable.senderId} = ${targetId} AND ${connectRequestsTable.recipientId} = ${viewerId}`
        )
      )
      .limit(1)
      .orderBy(sql`${connectRequestsTable.createdAt} DESC`);

    if (!req) return "none";
    if (req.status === "accepted") return "connected";
    if (req.status === "pending") {
      return req.senderId === viewerId ? "pending_sent" : "pending_received";
    }
    return "none";
  }
}
