import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { UserRepository } from "../repositories/UserRepository.js";
import { UserValidationService } from "../services/UserValidationService.js";
import { SelfViewStrategy } from "../services/strategies/ContactVisibilityStrategy.js";
import { signJwt } from "../lib/jwt.js";
import { sendVerificationEmail } from "../lib/mailer.js";
import { db, usersTable } from "@workspace/db";
import { eq, and, or, lt, lte } from "drizzle-orm";
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
  const otp = crypto.randomInt(100000, 999999).toString().padStart(6, "0");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

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
    isVerified: false,
    verificationCode: otp,
    verificationExpires: expiresAt,
    verificationRequestedAt: now,
    verificationAttempts: 1,
    cvLink: payload.cvLink ? (payload.cvLink as string).trim() : null,
  });

  // Fire-and-forget sending the verification email so mail failures don't block signup
  sendVerificationEmail(email, otp).catch((err) => {
    console.error("sendVerificationEmail failed:", err);
  });

  const strategy = new SelfViewStrategy();
  const view = strategy.buildView(user, "none");
  const token = signJwt({ userId: user.id, email: user.email, role: user.role });

  return res.status(201).json({ token, user: view });
}) as RequestHandler);

router.post("/auth/verify-email", (async (req, res) => {
  const { email, code } = req.body as { email?: string; code?: string };

  if (!email || !code) {
    return res.status(400).json({ error: "Email and code are required" });
  }

  const user = await userRepo.findByEmail(email.toLowerCase().trim());
  if (
    !user ||
    user.isVerified ||
    user.verificationCode !== code ||
    !user.verificationExpires ||
    new Date() > new Date(user.verificationExpires)
  ) {
    return res.status(400).json({ error: "Invalid or expired code" });
  }

  await db
    .update(usersTable)
    .set({ isVerified: true, verificationCode: null, verificationExpires: null })
    .where(eq(usersTable.id, user.id));

  return res.status(200).json({ message: "Verified successfully!" });
}) as RequestHandler);

router.post("/auth/resend-otp", (async (req, res) => {
  const { email } = req.body as { email?: string };

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await userRepo.findByEmail(normalizedEmail);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (user.isVerified) {
    return res.status(400).json({ error: "Account already verified" });
  }

  const now = new Date();
  const nextAllowedRequest = user.verificationRequestedAt
    ? new Date(new Date(user.verificationRequestedAt).getTime() + 60 * 1000)
    : new Date(0);

  if (user.verificationAttempts >= 4) {
    return res.status(429).json({ error: "Maximum OTP resend attempts exceeded. Contact support." });
  }

  if (now < nextAllowedRequest) {
    const waitSeconds = Math.ceil((nextAllowedRequest.getTime() - now.getTime()) / 1000);
    return res.status(429).json({ error: `Please wait ${waitSeconds} seconds before requesting a new code.` });
  }

  const otp = crypto.randomInt(100000, 999999).toString().padStart(6, "0");
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

  const [updatedUser] = await db
    .update(usersTable)
    .set({
      verificationCode: otp,
      verificationExpires: expiresAt,
      verificationRequestedAt: now,
      verificationAttempts: (user.verificationAttempts || 0) + 1,
    })
    .where(
      and(
        eq(usersTable.id, user.id),
        lt(usersTable.verificationAttempts, 4),
        or(
          eq(usersTable.verificationRequestedAt, null),
          lte(usersTable.verificationRequestedAt, new Date(now.getTime() - 60 * 1000)),
        ),
      ),
    );

  if (!updatedUser) {
    return res.status(429).json({ error: "Unable to resend OTP at this time. Try again later." });
  }

  try {
    await sendVerificationEmail(normalizedEmail, otp);
  } catch (err) {
    console.error("sendVerificationEmail failed:", err);
  }

  return res.status(200).json({ message: "Verification email resent successfully." });
}) as RequestHandler);

router.post("/auth/login", (async (req, res) => {
  try {
    console.log("Login attempt:", req.body.email);

    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = await userRepo.findByEmail(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: "Please verify your email address before logging in." });
    }

    const strategy = new SelfViewStrategy();
    const view = strategy.buildView(user, "none");
    const token = signJwt({ userId: user.id, email: user.email, role: user.role });

    console.log("Login success, token generated for user:", user.id);
    return res.json({ token, user: view });
  } catch (error) {
    console.error("Login route error:", error);
    return res.status(500).json({ error: "Server error during login" });
  }
}) as RequestHandler);

router.post("/auth/logout", (async (_, res) => {
  return res.json({ success: true });
}) as RequestHandler);

router.get("/auth/me", (async (req, res) => {
  const userId = (req as any).userId ?? (req as any).session?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const user = await userRepo.findById(userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const strategy = new SelfViewStrategy();
    const view = strategy.buildView(user, "none");

    return res.json(view);
  } catch (error) {
    console.error("/auth/me error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}) as RequestHandler);

export default router;
