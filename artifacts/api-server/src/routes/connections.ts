import { Router } from "express";
import { ConnectionManager } from "../services/ConnectionManager.js";
import { NotificationService } from "../services/NotificationService.js";
import { InAppNotificationProvider } from "../services/InAppNotificationProvider.js";
import { UserRepository } from "../repositories/UserRepository.js";
import type { RequestHandler } from "express";

const router = Router();
const connectionManager = new ConnectionManager();
const notificationService = new NotificationService(new InAppNotificationProvider());
const userRepo = new UserRepository();

router.get("/connections", (async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const data = await connectionManager.listForUser(req.session.userId);
  return res.json(data);
}) as RequestHandler);

router.post("/connections", (async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { recipientId, projectId } = req.body as {
    recipientId?: number;
    projectId?: number | null;
  };

  if (!recipientId || typeof recipientId !== "number") {
    return res.status(400).json({ error: "recipientId is required" });
  }

  const result = await connectionManager.sendRequest(
    req.session.userId,
    recipientId,
    projectId ?? null
  );

  if (!result.ok) {
    return res.status(409).json({ error: result.error });
  }

  const sender = await userRepo.findById(req.session.userId);
  if (sender) {
    await notificationService.notifyConnectionRequest(recipientId, sender.name);
  }

  const rows = await connectionManager.listForUser(req.session.userId);
  const sent = rows.outgoing.find((r) => r.id === result.request!.id);
  return res.status(201).json(sent ?? result.request);
}) as RequestHandler);

router.patch("/connections/:id", (async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const { status } = req.body as { status?: "accepted" | "declined" };
  if (status !== "accepted" && status !== "declined") {
    return res.status(400).json({ error: "status must be accepted or declined" });
  }

  const result = await connectionManager.respond(id, req.session.userId, status);

  if (!result.ok) {
    const code = result.error === "Forbidden" ? 403 : 400;
    return res.status(code).json({ error: result.error });
  }

  const responder = await userRepo.findById(req.session.userId);
  if (responder) {
    if (status === "accepted") {
      await notificationService.notifyConnectionAccepted(
        result.request!.senderId,
        responder.name
      );
    } else {
      await notificationService.notifyConnectionDeclined(
        result.request!.senderId,
        responder.name
      );
    }
  }

  const all = await connectionManager.listForUser(result.request!.recipientId);
  const updated = all.incoming.find((r) => r.id === id);
  return res.json(updated ?? result.request);
}) as RequestHandler);

export default router;
