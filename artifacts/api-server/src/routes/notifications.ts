import { Router } from "express";
import { NotificationRepository } from "../repositories/NotificationRepository.js";
import type { RequestHandler } from "express";

const router = Router();
const notificationRepo = new NotificationRepository();

router.get("/notifications", (async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const notifications = await notificationRepo.listForUser(req.session.userId);
  return res.json(notifications);
}) as RequestHandler);

router.patch("/notifications/:id/read", (async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const id = parseInt(req.params.id as string);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const notification = await notificationRepo.markRead(id, req.session.userId);
  if (!notification) {
    return res.status(404).json({ error: "Notification not found" });
  }

  return res.json(notification);
}) as RequestHandler);

export default router;
