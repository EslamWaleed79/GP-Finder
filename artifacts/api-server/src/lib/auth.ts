import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq, gt } from "drizzle-orm";
import type { RequestHandler } from "express";

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET or SESSION_SECRET environment variable is required");
}

const ALLOWED_UNVERIFIED_PATHS = new Set([
  "/api/auth/verify-email",
  "/api/auth/me",
  "/api/auth/resend-otp",
  "/api/auth/login",
  "/api/auth/signup",
]);

function isAllowedForUnverified(path: string): boolean {
  return ALLOWED_UNVERIFIED_PATHS.has(path);
}

export const jwtAuth: RequestHandler = async (req, res, next) => {
  if (!(req as any).session) {
    (req as any).session = {};
  }

  const authHeader = req.headers["authorization"] as string | undefined;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, decoded.userId));

    if (user) {
      if (!user.isVerified && !isAllowedForUnverified(req.path)) {
        return res.status(403).json({ error: "Email verification required to access this resource." });
      }

      (req as any).userId = user.id;
      (req as any).session.userId = user.id;
      (req as any).userVerified = user.isVerified;
    }

    return next();
  } catch (error) {
    console.warn("Invalid JWT token", error);
    return next();
  }
};
