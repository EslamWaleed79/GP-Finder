import { eq, or, and, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  connectRequestsTable,
  type ConnectRequest,
} from "@workspace/db";

export interface ConnectRequestWithNames {
  id: number;
  senderId: number;
  recipientId: number;
  projectId: number | null;
  status: "pending" | "accepted" | "declined";
  createdAt: Date;
  senderName: string;
  recipientName: string;
  projectTitle: string | null;
}

export class ConnectionManager {
  async sendRequest(
    senderId: number,
    recipientId: number,
    projectId?: number | null
  ): Promise<{ ok: boolean; error?: string; request?: ConnectRequest }> {
    if (senderId === recipientId) {
      return { ok: false, error: "Cannot connect with yourself" };
    }

    const existing = await db
      .select()
      .from(connectRequestsTable)
      .where(
        and(
          or(
            and(
              eq(connectRequestsTable.senderId, senderId),
              eq(connectRequestsTable.recipientId, recipientId)
            ),
            and(
              eq(connectRequestsTable.senderId, recipientId),
              eq(connectRequestsTable.recipientId, senderId)
            )
          ),
          or(
            eq(connectRequestsTable.status, "pending"),
            eq(connectRequestsTable.status, "accepted")
          )
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return {
        ok: false,
        error: "A pending or accepted connection already exists",
      };
    }

    const [request] = await db
      .insert(connectRequestsTable)
      .values({ senderId, recipientId, projectId: projectId ?? null })
      .returning();

    return { ok: true, request: request! };
  }

  async respond(
    requestId: number,
    responderId: number,
    action: "accepted" | "declined"
  ): Promise<{
    ok: boolean;
    error?: string;
    request?: ConnectRequest;
  }> {
    const [req] = await db
      .select()
      .from(connectRequestsTable)
      .where(eq(connectRequestsTable.id, requestId))
      .limit(1);

    if (!req) return { ok: false, error: "Request not found" };
    if (req.recipientId !== responderId)
      return { ok: false, error: "Forbidden" };
    if (req.status !== "pending")
      return { ok: false, error: "Request already resolved" };

    const [updated] = await db
      .update(connectRequestsTable)
      .set({ status: action })
      .where(eq(connectRequestsTable.id, requestId))
      .returning();

    return { ok: true, request: updated! };
  }

  async countPending(userId: number): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(connectRequestsTable)
      .where(
        and(
          eq(connectRequestsTable.recipientId, userId),
          eq(connectRequestsTable.status, "pending")
        )
      );
    return Number(row?.count ?? 0);
  }

  async listForUser(userId: number): Promise<{
    incoming: ConnectRequestWithNames[];
    outgoing: ConnectRequestWithNames[];
  }> {
    const rows = await db.execute(sql`
      SELECT
        cr.id,
        cr.sender_id AS "senderId",
        cr.recipient_id AS "recipientId",
        cr.project_id AS "projectId",
        cr.status,
        cr.created_at AS "createdAt",
        u_sender.name AS "senderName",
        u_recipient.name AS "recipientName",
        p.title AS "projectTitle"
      FROM connect_requests cr
      JOIN users u_sender ON u_sender.id = cr.sender_id
      JOIN users u_recipient ON u_recipient.id = cr.recipient_id
      LEFT JOIN projects p ON p.id = cr.project_id
      WHERE cr.sender_id = ${userId} OR cr.recipient_id = ${userId}
      ORDER BY cr.created_at DESC
    `);

    const all = ((rows.rows ?? rows) as unknown) as ConnectRequestWithNames[];
    return {
      incoming: all.filter((r) => r.recipientId === userId),
      outgoing: all.filter((r) => r.senderId === userId),
    };
  }
}
