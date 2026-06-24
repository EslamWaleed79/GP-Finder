import { Router } from "express";
import { UserRepository } from "../repositories/UserRepository.js";
import { ProjectRepository } from "../repositories/ProjectRepository.js";
import {
  ConnectedViewStrategy,
} from "../services/strategies/ContactVisibilityStrategy.js";
import type { RequestHandler } from "express";

const router = Router();
const userRepo = new UserRepository();
const projectRepo = new ProjectRepository();

async function requireAdmin(req: any, res: any, next: any) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const user = await userRepo.findById(req.session.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

router.get("/admin/users", requireAdmin as RequestHandler, (async (_req, res) => {
  const users = await userRepo.list({});
  const strategy = new ConnectedViewStrategy();
  const views = users.map((u) => strategy.buildView(u, "connected"));
  return res.json(views);
}) as RequestHandler);

router.delete("/admin/users/:id", requireAdmin as RequestHandler, (async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await userRepo.delete(id);
  return res.json({ message: "User deleted" });
}) as RequestHandler);

router.get("/admin/projects", requireAdmin as RequestHandler, (async (_req, res) => {
  const projects = await projectRepo.list({});
  return res.json(projects);
}) as RequestHandler);

router.delete("/admin/projects/:id", requireAdmin as RequestHandler, (async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await projectRepo.delete(id);
  return res.json({ message: "Project deleted" });
}) as RequestHandler);

export default router;
