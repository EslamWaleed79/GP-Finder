import { Router } from "express";
import bcrypt from "bcrypt";
import { UserRepository } from "../repositories/UserRepository.js";
import { UserValidationService } from "../services/UserValidationService.js";
import {
  ContactVisibilityResolver,
  PublicViewStrategy,
} from "../services/strategies/ContactVisibilityStrategy.js";
import type { RequestHandler } from "express";

const router = Router();
const userRepo = new UserRepository();
const validator = new UserValidationService();
const visibilityResolver = new ContactVisibilityResolver();

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

router.post("/auth/signup", (async (req, res) => {
  const payload = req.body as {
    name?: unknown;
    email?: unknown;
    password?: unknown;
    major?: unknown;
    skills?: unknown;
    bio?: unknown;
    phone?: unknown;
  };

  const validation = validator.validateSignupPayload(payload);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const email = (payload.email as string).toLowerCase().trim();
  const existing = await userRepo.findByEmail(email);
  if (existing) {
    return res.status(409).json({ error: "Email already in use" });
  }

  const passwordHash = await bcrypt.hash(payload.password as string, 12);
  const user = await userRepo.create({
    name: (payload.name as string).trim(),
    email,
    passwordHash,
    major: payload.major as string,
    skills: Array.isArray(payload.skills) ? (payload.skills as string[]) : [],
    bio: typeof payload.bio === "string" ? payload.bio : null,
    phone: typeof payload.phone === "string" ? payload.phone : null,
    role: "student",
  });

  req.session.userId = user.id;

  const strategy = new PublicViewStrategy();
  const view = strategy.buildView(user, "none");
  return res.status(201).json(view);
}) as RequestHandler);

router.post("/auth/login", (async (req, res) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await userRepo.findByEmail(email.toLowerCase().trim());
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  req.session.userId = user.id;

  const strategy = new PublicViewStrategy();
  const view = strategy.buildView(user, "none");
  return res.json(view);
}) as RequestHandler);

router.post("/auth/logout", (async (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out" });
  });
}) as RequestHandler);

router.get("/auth/me", (async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const user = await userRepo.findById(req.session.userId);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const strategy = new PublicViewStrategy();
  const view = strategy.buildView(user, "none");
  return res.json(view);
}) as RequestHandler);

export default router;
