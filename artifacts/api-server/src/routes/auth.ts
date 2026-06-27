import { Router } from "express";
import "express-session";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { UserRepository } from "../repositories/UserRepository.js";
import { UserValidationService } from "../services/UserValidationService.js";
import { SelfViewStrategy } from "../services/strategies/ContactVisibilityStrategy.js";
import { JWT_SECRET, signJwt } from "../lib/jwt.js";
import { sendVerificationEmail } from "../lib/mailer.js";
import { db, usersTable } from "@workspace/db";
import { eq, and, or, lt, lte, isNull } from "drizzle-orm";
import type { RequestHandler } from "express";

const router = Router();
const userRepo = new UserRepository();
const validator = new UserValidationService();

type PendingRegistrationPayload = {
  email: string;
  password: string;
  name: string;
  major: string;
  skills: string[];
  bio: string | null;
  phone: string;
  gpa: number;
  bylaw: "2018" | "2023";
  track: "Software Engineering" | "Hardware Design" | "Networks and Cybersecurity" | "AI" | "Embedded" | "Other" | null;
  customTrack: string | null;
  gender: "Male" | "Female";
  role: "student" | "admin";
  cvLink: string | null;
  otp: string;
  verificationAttempts: number;
  verificationRequestedAt: number;
};

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

  const pendingRegistrationPayload: PendingRegistrationPayload = {
    email,
    password: passwordHash,
    name: (payload.name as string).trim(),
    major: "Computer Engineering",
    skills: Array.isArray(payload.skills) ? (payload.skills as string[]) : [],
    bio: typeof payload.bio === "string" ? payload.bio : null,
    phone: payload.phone as string,
    gpa: Number(payload.gpa),
    bylaw: payload.bylaw as "2018" | "2023",
    track: payload.track as PendingRegistrationPayload["track"],
    customTrack:
      payload.track === "Other" && typeof payload.customTrack === "string"
        ? payload.customTrack.trim()
        : null,
    gender: payload.gender as "Male" | "Female",
    role: "student",
    cvLink: payload.cvLink ? (payload.cvLink as string).trim() : null,
    otp,
    verificationAttempts: 0,
    verificationRequestedAt: Date.now(),
  };

  const pendingRegistrationToken = signJwt(pendingRegistrationPayload, { expiresIn: "15m" });

  sendVerificationEmail(email, otp).catch((err) => {
    console.error("sendVerificationEmail failed:", err);
  });

  return res.status(200).json({
    message: "Verification email sent",
    pendingRegistrationToken,
  });
}) as RequestHandler);

router.post("/auth/verify-email", (async (req, res) => {
  const { pendingRegistrationToken, otp } = req.body as {
    pendingRegistrationToken?: string;
    otp?: string;
  };

  if (!pendingRegistrationToken || !otp) {
    return res.status(400).json({ error: "Pending registration token and OTP are required" });
  }

  let decodedPayload: PendingRegistrationPayload;
  try {
    const decoded = jwt.verify(pendingRegistrationToken, JWT_SECRET) as unknown;
    if (typeof decoded !== "object" || decoded === null || !("email" in decoded) || !("otp" in decoded)) {
      throw new Error("Invalid pending registration token");
    }
    decodedPayload = decoded as PendingRegistrationPayload;
  } catch {
    return res.status(400).json({ error: "Invalid or expired registration token" });
  }

  if (decodedPayload.otp !== otp.trim()) {
    return res.status(400).json({ error: "Invalid or expired code" });
  }

  const { otp: tokenOtp, password, ...userData } = decodedPayload;
  const [user] = await db
    .insert(usersTable)
    .values({
      ...userData,
      passwordHash: password,
      isVerified: true,
      verificationCode: null,
      verificationExpires: null,
      verificationRequestedAt: null,
      verificationAttempts: 0,
    })
    .returning();

  if (!user) {
    return res.status(500).json({ error: "Failed to create account" });
  }

  const strategy = new SelfViewStrategy();
  const view = strategy.buildView(user, "none");
  const token = signJwt({ userId: user.id, email: user.email, role: user.role });

  return res.status(200).json({ message: "Verified successfully!", token, user: view });
}) as RequestHandler);

router.post("/auth/resend-otp", (async (req, res) => {
  const { pendingRegistrationToken } = req.body as { pendingRegistrationToken?: string };

  if (!pendingRegistrationToken) {
    return res.status(400).json({ error: "Pending registration token is required" });
  }

  let decodedPayload: PendingRegistrationPayload;
  try {
    const decoded = jwt.verify(pendingRegistrationToken, JWT_SECRET) as unknown;
    if (typeof decoded !== "object" || decoded === null || !("email" in decoded) || !("otp" in decoded)) {
      throw new Error("Invalid pending registration token");
    }
    decodedPayload = decoded as PendingRegistrationPayload;
  } catch {
    return res.status(400).json({ error: "Invalid or expired registration token" });
  }

  const now = Date.now();
  const lastRequestedAt = decodedPayload.verificationRequestedAt ?? 0;
  const nextAllowedRequestAt = lastRequestedAt + 60 * 1000;

  if (decodedPayload.verificationAttempts >= 4) {
    return res.status(429).json({ error: "Maximum OTP resend attempts exceeded. Contact support." });
  }

  if (now < nextAllowedRequestAt) {
    const waitSeconds = Math.ceil((nextAllowedRequestAt - now) / 1000);
    return res.status(429).json({ error: `Please wait ${waitSeconds} seconds before requesting a new code.` });
  }

  const otp = crypto.randomInt(100000, 999999).toString().padStart(6, "0");
  const refreshedPayload: PendingRegistrationPayload = {
    ...decodedPayload,
    otp,
    verificationAttempts: decodedPayload.verificationAttempts + 1,
    verificationRequestedAt: now,
  };
  const refreshedToken = signJwt(refreshedPayload, { expiresIn: "15m" });

  try {
    await sendVerificationEmail(decodedPayload.email, otp);
  } catch (err) {
    console.error("sendVerificationEmail failed:", err);
  }

  return res.status(200).json({
    message: "Verification email resent successfully.",
    pendingRegistrationToken: refreshedToken,
  });
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
    // Perform a fresh database lookup to ensure absolute latest isVerified status
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

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
