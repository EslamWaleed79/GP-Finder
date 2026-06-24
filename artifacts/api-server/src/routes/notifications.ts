import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import type { RequestHandler } from "express";

const router = Router();

router.get("/notifications", (async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, req.session.userId))
    .orderBy(notificationsTable.createdAt);

  return res.json(notifications.reverse());
}) as RequestHandler);

router.patch("/notifications/:id/read", (async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [notification] = await db
    .update(notificationsTable)
    .set({ read: true })
    .where(
      and(
        eq(notificationsTable.id, id),
        eq(notificationsTable.userId, req.session.userId)
      )
    )
    .returning();

  if (!notification) {
    return res.status(404).json({ error: "Notification not found" });
  }

  return res.json(notification);
}) as RequestHandler);

export default router;
