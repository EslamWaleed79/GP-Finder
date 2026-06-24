import { eq, and, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { notificationsTable, type Notification } from "@workspace/db";

export class NotificationRepository {
  async listForUser(userId: number): Promise<Notification[]> {
    return db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, userId))
      .orderBy(sql`${notificationsTable.createdAt} DESC`);
  }

  async markRead(
    id: number,
    userId: number
  ): Promise<Notification | undefined> {
    const [notification] = await db
      .update(notificationsTable)
      .set({ read: true })
      .where(
        and(
          eq(notificationsTable.id, id),
          eq(notificationsTable.userId, userId)
        )
      )
      .returning();
    return notification;
  }

  async countUnread(userId: number): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, userId),
          eq(notificationsTable.read, false)
        )
      );
    return Number(row?.count ?? 0);
  }
}
