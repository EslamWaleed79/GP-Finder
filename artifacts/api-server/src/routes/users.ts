import { Router } from "express";
import { UserRepository } from "../repositories/UserRepository.js";
import { ProjectRepository } from "../repositories/ProjectRepository.js";
import {
  ContactVisibilityResolver,
  PublicViewStrategy,
} from "../services/strategies/ContactVisibilityStrategy.js";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { notificationsTable, connectRequestsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import type { RequestHandler } from "express";

const router = Router();
const userRepo = new UserRepository();
const projectRepo = new ProjectRepository();
const visibilityResolver = new ContactVisibilityResolver();

router.get("/users", (async (req, res) => {
  const { skills, major, search } = req.query as {
    skills?: string;
    major?: string;
    search?: string;
  };

  const skillsArr = skills
    ? skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;

  const users = await userRepo.list({ skills: skillsArr, major, search });

  const viewerId: number | undefined = req.session.userId;

  const views = await Promise.all(
    users.map(async (u) => {
      const connectStatus = viewerId
        ? await userRepo.getConnectionStatus(viewerId, u.id)
        : "none";
      const strategy = new PublicViewStrategy();
      return strategy.buildView(u, connectStatus as "none" | "pending_sent" | "pending_received" | "connected");
    })
  );

  return res.json(views);
}) as RequestHandler);

router.get("/users/:id", (async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const user = await userRepo.findById(id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const viewerId: number | undefined = req.session.userId;
  const connectStatus = viewerId
    ? await userRepo.getConnectionStatus(viewerId, id)
    : ("none" as const);

  const strategy = visibilityResolver.resolve(connectStatus);
  const view = strategy.buildView(user, connectStatus as "none" | "pending_sent" | "pending_received" | "connected");
  return res.json(view);
}) as RequestHandler);

router.patch("/users/:id/profile", (async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  if (req.session.userId !== id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { name, major, skills, bio, phone } = req.body as {
    name?: string;
    major?: string;
    skills?: string[];
    bio?: string | null;
    phone?: string | null;
  };

  const updated = await userRepo.update(id, { name, major, skills, bio, phone });
  if (!updated) return res.status(404).json({ error: "User not found" });

  const strategy = new PublicViewStrategy();
  const view = strategy.buildView(updated, "none");
  return res.json(view);
}) as RequestHandler);

router.get("/dashboard/stats", (async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const [openProjects, totalStudents, myProjects] = await Promise.all([
    projectRepo.countOpen(),
    userRepo.count(),
    projectRepo.countByOwner(req.session.userId),
  ]);

  const [pendingRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(connectRequestsTable)
    .where(
      sql`${connectRequestsTable.recipientId} = ${req.session.userId} AND ${connectRequestsTable.status} = 'pending'`
    );

  const [unreadRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notificationsTable)
    .where(
      sql`${notificationsTable.userId} = ${req.session.userId} AND ${notificationsTable.read} = false`
    );

  return res.json({
    openProjects,
    totalStudents,
    myProjects,
    pendingRequests: Number(pendingRow?.count ?? 0),
    unreadNotifications: Number(unreadRow?.count ?? 0),
  });
}) as RequestHandler);

export default router;
