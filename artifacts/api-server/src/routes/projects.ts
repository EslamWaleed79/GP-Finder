import { Router } from "express";
import { ProjectRepository } from "../repositories/ProjectRepository.js";
import { UserRepository } from "../repositories/UserRepository.js";
import type { RequestHandler } from "express";

const router = Router();
const projectRepo = new ProjectRepository();
const userRepo = new UserRepository();

router.get("/projects", (async (req, res) => {
  const { skills, status, search } = req.query as {
    skills?: string;
    status?: "open" | "in_progress" | "closed";
    search?: string;
  };

  const skillsArr = skills
    ? skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;

  const projects = await projectRepo.list({ skills: skillsArr, status, search });

  const viewerId: number | undefined = req.session.userId;

  const result = await Promise.all(
    projects.map(async (p) => {
      const connectStatus = viewerId
        ? await userRepo.getConnectionStatus(viewerId, p.ownerId)
        : "none";
      return {
        ...p,
        connectStatus,
      };
    })
  );

  return res.json(result);
}) as RequestHandler);

router.post("/projects", (async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { title, description, requiredSkills, teamSizeCap, status } =
    req.body as {
      title?: string;
      description?: string;
      requiredSkills?: string[];
      teamSizeCap?: number;
      status?: "open" | "in_progress" | "closed";
    };

  if (!title || !description || !teamSizeCap) {
    return res.status(400).json({ error: "title, description, and teamSizeCap are required" });
  }

  const project = await projectRepo.create({
    title,
    description,
    requiredSkills: requiredSkills ?? [],
    teamSizeCap,
    status: status ?? "open",
    ownerId: req.session.userId,
  });

  return res.status(201).json(project);
}) as RequestHandler);

router.get("/projects/:id", (async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const project = await projectRepo.findById(id);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const viewerId: number | undefined = req.session.userId;
  const connectStatus = viewerId
    ? await userRepo.getConnectionStatus(viewerId, project.ownerId)
    : "none";

  return res.json({ ...project, connectStatus });
}) as RequestHandler);

router.patch("/projects/:id", (async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const existing = await projectRepo.findById(id);
  if (!existing) return res.status(404).json({ error: "Project not found" });

  const viewer = await userRepo.findById(req.session.userId);
  if (existing.ownerId !== req.session.userId && viewer?.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { title, description, requiredSkills, status, teamSizeCap } =
    req.body as {
      title?: string;
      description?: string;
      requiredSkills?: string[];
      status?: "open" | "in_progress" | "closed";
      teamSizeCap?: number;
    };

  const updated = await projectRepo.update(id, {
    title,
    description,
    requiredSkills,
    status,
    teamSizeCap,
  });

  return res.json(updated);
}) as RequestHandler);

router.delete("/projects/:id", (async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const existing = await projectRepo.findById(id);
  if (!existing) return res.status(404).json({ error: "Project not found" });

  const viewer = await userRepo.findById(req.session.userId);
  if (existing.ownerId !== req.session.userId && viewer?.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  await projectRepo.delete(id);
  return res.json({ message: "Project deleted" });
}) as RequestHandler);

export default router;
