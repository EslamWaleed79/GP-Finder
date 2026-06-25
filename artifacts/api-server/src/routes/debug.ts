// TODO: DELETE BEFORE DEPLOY
import { Router } from "express";
import { UserRepository } from "../repositories/UserRepository.js";
import {
  SelfViewStrategy,
  ConnectedViewStrategy,
  PublicViewStrategy,
} from "../services/strategies/ContactVisibilityStrategy.js";
import type { RequestHandler } from "express";

const router = Router();
const userRepo = new UserRepository();

// TODO: DELETE BEFORE DEPLOY — admin-only privacy verification route
router.get("/debug/privacy-check", (async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const viewer = await userRepo.findById(req.session.userId);
  if (!viewer || viewer.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }

  const targetId = parseInt((req.query.targetId as string) ?? "0");
  if (isNaN(targetId) || targetId === 0) {
    return res.status(400).json({ error: "targetId query param required" });
  }

  const target = await userRepo.findById(targetId);
  if (!target) return res.status(404).json({ error: "Target user not found" });

  const connectStatus = await userRepo.getConnectionStatus(req.session.userId, targetId);
  const isSelf = req.session.userId === targetId;

  const publicView = new PublicViewStrategy().buildView(target, "none");
  const connectedView = new ConnectedViewStrategy().buildView(target, "connected");
  const selfView = new SelfViewStrategy().buildView(target, "none");
  const currentStrategyView =
    connectStatus === "connected"
      ? connectedView
      : isSelf
        ? selfView
        : publicView;

  return res.json({
    targetId,
    connectStatus,
    isSelf,
    currentResponse: {
      phone: currentStrategyView.phone ?? null,
      gpa: currentStrategyView.gpa ?? null,
    },
    privacyRules: {
      publicView: { phone: publicView.phone ?? null, gpa: publicView.gpa ?? null },
      connectedView: { phone: connectedView.phone, gpa: connectedView.gpa },
    },
    verdict:
      connectStatus === "connected" || isSelf
        ? "phone and GPA VISIBLE ✓"
        : "phone and GPA HIDDEN ✓",
  });
}) as RequestHandler);

export default router;
