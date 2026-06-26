import { Router } from "express";
import { UserRepository } from "../repositories/UserRepository.js";
import { ProjectRepository } from "../repositories/ProjectRepository.js";
import { NotificationRepository } from "../repositories/NotificationRepository.js";
import { ConnectionManager } from "../services/ConnectionManager.js";
import {
  ContactVisibilityResolver,
  SelfViewStrategy,
  PublicViewStrategy,
} from "../services/strategies/ContactVisibilityStrategy.js";
import type { RequestHandler } from "express";

const router = Router();
const userRepo = new UserRepository();
const projectRepo = new ProjectRepository();
const notificationRepo = new NotificationRepository();
const connectionManager = new ConnectionManager();
const visibilityResolver = new ContactVisibilityResolver();

router.get("/users", (async (req, res) => {
  const { skills, major, search, track, bylaw, gender } = req.query as {
    skills?: string;
    major?: string;
    search?: string;
    track?: string;
    bylaw?: string;
    gender?: string;
  };

  const skillsArr = skills
    ? skills.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  const users = await userRepo.list({
    skills: skillsArr,
    major,
    search,
    track: track && track !== "All" ? track : undefined,
    bylaw: bylaw && bylaw !== "All" ? bylaw : undefined,
    gender: gender && gender !== "All" ? gender : undefined,
  });

  const viewerId: number | undefined = req.session.userId;

  const views = await Promise.all(
    users.map(async (u) => {
      const connectStatus = viewerId
        ? await userRepo.getConnectionStatus(viewerId, u.id)
        : ("none" as const);
      const strategy = new PublicViewStrategy();
      return strategy.buildView(u, connectStatus);
    })
  );

  return res.json(views);
}) as RequestHandler);

router.get("/users/:id", (async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const user = await userRepo.findById(id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const viewerId: number | undefined = req.session.userId;

  // Self-view: always return full data
  if (viewerId === id) {
    const strategy = new SelfViewStrategy();
    return res.json(strategy.buildView(user, "none"));
  }

  const connectStatus = viewerId
    ? await userRepo.getConnectionStatus(viewerId, id)
    : ("none" as const);

  const strategy = visibilityResolver.resolve(connectStatus);
  const view = strategy.buildView(user, connectStatus);
  return res.json(view);
}) as RequestHandler);

router.patch("/users/:id/profile", (async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const id = parseInt(req.params.id as string);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  if (req.session.userId !== id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { name, skills, bio, phone, gpa, bylaw, track, customTrack, gender, cvLink } =
    req.body as {
      name?: string;
      skills?: string[];
      bio?: string | null;
      phone?: string | null;
      gpa?: number | null;
      bylaw?: "2018" | "2023";
      track?: string;
      customTrack?: string | null;
      gender?: "Male" | "Female";
      cvLink?: string | null;
    };

  const updated = await userRepo.update(id, {
    name,
    skills,
    bio,
    phone,
    gpa,
    bylaw,
    track: track as any,
    customTrack,
    gender,
    cvLink,
  });
  if (!updated) return res.status(404).json({ error: "User not found" });

  const strategy = new SelfViewStrategy();
  return res.json(strategy.buildView(updated, "none"));
}) as RequestHandler);

router.get("/dashboard/stats", (async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const userId = req.session.userId;

  const [openProjects, totalStudents, myProjects, unreadNotifications] =
    await Promise.all([
      projectRepo.countOpen(),
      userRepo.count(),
      projectRepo.countByOwner(userId),
      notificationRepo.countUnread(userId),
    ]);

  const pendingRequests = await connectionManager.countPending(userId);

  return res.json({
    openProjects,
    totalStudents,
    myProjects,
    pendingRequests,
    unreadNotifications,
  });
}) as RequestHandler);

export default router;
