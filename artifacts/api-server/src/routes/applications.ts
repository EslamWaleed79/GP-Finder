import { Router } from "express";
import { ProjectApplicationRepository } from "../repositories/ProjectApplicationRepository.js";
import { NotificationService } from "../services/NotificationService.js";
import { InAppNotificationProvider } from "../services/InAppNotificationProvider.js";
import { UserRepository } from "../repositories/UserRepository.js";
import { ProjectRepository } from "../repositories/ProjectRepository.js";
import type { RequestHandler } from "express";

const router = Router();
const appRepo = new ProjectApplicationRepository();
const notificationService = new NotificationService(new InAppNotificationProvider());
const userRepo = new UserRepository();
const projectRepo = new ProjectRepository();

// Apply to a project
router.post("/applications", (async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { projectId } = req.body as { projectId?: number };
  if (!projectId) return res.status(400).json({ error: "projectId is required" });

  const result = await appRepo.apply(req.session.userId, projectId);
  if (!result.ok) return res.status(409).json({ error: result.error });

  // Notify project leader
  const project = await projectRepo.findById(projectId);
  const applicant = await userRepo.findById(req.session.userId);
  if (project?.leaderId && applicant) {
    await notificationService.notifyRaw(
      project.leaderId,
      `${applicant.name} applied to your project "${project.title}"`
    );
  }

  return res.status(201).json(result.application);
}) as RequestHandler);

// Get applications for a project (leader only sees pending applicant info without GPA/phone)
router.get("/projects/:id/applications", (async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const projectId = parseInt(req.params.id as string);
  if (isNaN(projectId)) return res.status(400).json({ error: "Invalid id" });

  const project = await projectRepo.findById(projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (project.leaderId !== req.session.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const applications = await appRepo.listForProject(projectId);
  return res.json(applications);
}) as RequestHandler);

// Get my applications
router.get("/applications/mine", (async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const apps = await appRepo.listForUser(req.session.userId);
  return res.json(apps);
}) as RequestHandler);

// Leader: accept / reject / remove; member: leave (action in body)
router.patch("/applications/:id", (async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const applicationId = parseInt(req.params.id as string);
  if (isNaN(applicationId)) return res.status(400).json({ error: "Invalid id" });

  const { action } = req.body as {
    action?: "accepted" | "rejected" | "removed" | "left";
  };

  if (!action || !["accepted", "rejected", "removed", "left"].includes(action)) {
    return res.status(400).json({ error: "action must be accepted|rejected|removed|left" });
  }

  if (action === "left") {
    const result = await appRepo.leave(applicationId, req.session.userId);
    if (!result.ok) {
      const code = result.error === "Forbidden" ? 403 : 400;
      return res.status(code).json({ error: result.error });
    }
    return res.json(result.application);
  }

  const result = await appRepo.decide(applicationId, req.session.userId, action);
  if (!result.ok) {
    const code = result.error === "Forbidden" ? 403 : 400;
    return res.status(code).json({ error: result.error });
  }

  // Notify applicant
  const app = result.application!;
  const leader = await userRepo.findById(req.session.userId);
  const project = await projectRepo.findById(app.projectId);
  if (leader && project) {
    const msgMap = {
      accepted: `Your application to "${project.title}" was accepted!`,
      rejected: `Your application to "${project.title}" was declined.`,
      removed: `You were removed from the project "${project.title}".`,
    };
    await notificationService.notifyRaw(app.applicantId, msgMap[action]);
  }

  return res.json(result.application);
}) as RequestHandler);

export default router;
