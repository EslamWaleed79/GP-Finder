import { Router } from "express";
import { ProjectRepository } from "../repositories/ProjectRepository.js";
import { UserRepository } from "../repositories/UserRepository.js";
import { ProjectApplicationRepository } from "../repositories/ProjectApplicationRepository.js";
import type { RequestHandler } from "express";

const router = Router();
const projectRepo = new ProjectRepository();
const userRepo = new UserRepository();
const appRepo = new ProjectApplicationRepository();

router.get("/projects", (async (req, res) => {
  const { skills, status, search, track } = req.query as {
    skills?: string;
    status?: "open" | "in_progress" | "closed";
    search?: string;
    track?: string;
  };

  const skillsArr = skills
    ? skills.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  const projects = await projectRepo.list({
    skills: skillsArr,
    status,
    search,
    track: track && track !== "All" ? track : undefined,
  });

  const viewerId: number | undefined = req.session.userId;
  const viewerAppStatus = viewerId
    ? await appRepo.getApplicationStatus(viewerId)
    : null;

  const result = await Promise.all(
    projects.map(async (p) => {
      const connectStatus = viewerId
        ? await userRepo.getConnectionStatus(viewerId, p.ownerId)
        : "none";
      const canApply =
        viewerId !== undefined &&
        viewerId !== p.leaderId &&
        p.status === "open" &&
        p.memberCount < p.maxMembers &&
        viewerAppStatus !== null &&
        !viewerAppStatus.isLeader &&
        !viewerAppStatus.hasAcceptedApp &&
        !viewerAppStatus.pendingProjectIds.includes(p.id);
      return { ...p, connectStatus, canApply };
    })
  );

  return res.json(result);
}) as RequestHandler);

router.post("/projects", (async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { title, description, requiredSkills, teamSizeCap, maxMembers, status, track } =
    req.body as {
      title?: string;
      description?: string;
      requiredSkills?: string[];
      teamSizeCap?: number;
      maxMembers?: number;
      status?: "open" | "in_progress" | "closed";
      track?: string;
    };

  if (!title || !description) {
    return res.status(400).json({ error: "title and description are required" });
  }

  // One project per leader check
  const existing = await projectRepo.findByLeader(req.session.userId);
  if (existing) {
    return res.status(409).json({ error: "You already have a project. You must leave your current project before joining a new one." });
  }
  const appStatus = await appRepo.getApplicationStatus(req.session.userId);
  if (appStatus.hasAcceptedApp) {
    return res.status(409).json({ error: "You must leave your current project before joining a new one." });
  }

  const cap = maxMembers ?? teamSizeCap ?? 5;
  const project = await projectRepo.create({
    title,
    description,
    requiredSkills: requiredSkills ?? [],
    teamSizeCap: cap,
    maxMembers: cap,
    status: status ?? "open",
    ownerId: req.session.userId,
    leaderId: req.session.userId,
    track: track as any ?? null,
  });

  return res.status(201).json({ ...project, connectStatus: "none", canApply: false });
}) as RequestHandler);

router.get("/projects/:id", (async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const project = await projectRepo.findById(id);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const viewerId: number | undefined = req.session.userId;
  const connectStatus = viewerId
    ? await userRepo.getConnectionStatus(viewerId, project.ownerId)
    : "none";

  const viewerAppStatus = viewerId
    ? await appRepo.getApplicationStatus(viewerId)
    : null;

  const canApply =
    viewerId !== undefined &&
    viewerId !== project.leaderId &&
    project.status === "open" &&
    project.memberCount < project.maxMembers &&
    viewerAppStatus !== null &&
    !viewerAppStatus.isLeader &&
    !viewerAppStatus.hasAcceptedApp &&
    !viewerAppStatus.pendingProjectIds.includes(project.id);

  return res.json({ ...project, connectStatus, canApply });
}) as RequestHandler);

router.patch("/projects/:id", (async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const id = parseInt(req.params.id as string);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const existing = await projectRepo.findById(id);
  if (!existing) return res.status(404).json({ error: "Project not found" });

  const viewer = await userRepo.findById(req.session.userId);
  if (existing.leaderId !== req.session.userId && viewer?.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { title, description, requiredSkills, status, teamSizeCap, maxMembers, track } =
    req.body as {
      title?: string;
      description?: string;
      requiredSkills?: string[];
      status?: "open" | "in_progress" | "closed";
      teamSizeCap?: number;
      maxMembers?: number;
      track?: string;
    };

  // Validate maxMembers not lowered below current count
  const newMax = maxMembers ?? teamSizeCap;
  if (newMax !== undefined && newMax < existing.memberCount) {
    return res.status(400).json({
      error: `Cannot lower max members below current member count (${existing.memberCount}). Remove members first.`,
    });
  }

  // Status can never go back to open
  if (status === "open" && existing.status !== "open") {
    return res.status(400).json({ error: "Status cannot be changed back to Open" });
  }

  const updated = await projectRepo.update(id, {
    title,
    description,
    requiredSkills,
    status,
    teamSizeCap: newMax ?? existing.teamSizeCap,
    maxMembers: newMax ?? existing.maxMembers,
    track: track as any,
  });

  return res.json({ ...updated, connectStatus: "none", canApply: false });
}) as RequestHandler);

router.delete("/projects/:id", (async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const id = parseInt(req.params.id as string);
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
