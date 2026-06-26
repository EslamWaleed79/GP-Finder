import { Router } from "express";
import bcrypt from "bcrypt";
import { UserRepository } from "../repositories/UserRepository.js";
import { UserValidationService } from "../services/UserValidationService.js";
import {
  SelfViewStrategy,
  PublicViewStrategy,
} from "../services/strategies/ContactVisibilityStrategy.js";
import type { RequestHandler } from "express";

const router = Router();
const userRepo = new UserRepository();
const validator = new UserValidationService();

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

router.post("/auth/signup", (async (req, res) => {
  const payload = req.body as Record<string, unknown>;

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
    major: "Computer Engineering",
    skills: Array.isArray(payload.skills) ? (payload.skills as string[]) : [],
    bio: typeof payload.bio === "string" ? payload.bio : null,
    phone: payload.phone as string,
    gpa: Number(payload.gpa),
    bylaw: payload.bylaw as "2018" | "2023",
    track: payload.track as any,
    customTrack:
      payload.track === "Other" && typeof payload.customTrack === "string"
        ? payload.customTrack.trim()
        : null,
    gender: payload.gender as "Male" | "Female",
    role: "student",
  });

  req.session.userId = user.id;

  const strategy = new SelfViewStrategy();
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

  return req.session.regenerate((err) => {
    if (err) {
      console.error("Session regenerate error:", err);
      return res.status(500).json({ error: "Session error" });
    }

    req.session.userId = user.id;
    req.session.email = user.email;

    const strategy = new SelfViewStrategy();
    const view = strategy.buildView(user, "none");

    return req.session.save((saveErr) => {
      if (saveErr) {
        console.error("Session save error:", saveErr);
        return res.status(500).json({ error: "Session error" });
      }

      console.log("Login successful - SessionID:", req.sessionID, "userId:", req.session.userId);
      return res.json(view);
    });
  });
}) as RequestHandler);

router.post("/auth/logout", (async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ error: "Logout failed" });
    }
    return res.json({ success: true });
  });
}) as RequestHandler);

router.get("/auth/me", (async (req, res) => {
  console.log("ME - SessionID:", req.sessionID);
  console.log("ME - Full session:", req.session);

  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const user = await userRepo.findById(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error("/auth/me error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}) as RequestHandler);

export default router;
