import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET or SESSION_SECRET environment variable is required");
}

export const jwtAuth: RequestHandler = (req, res, next) => {
  const authHeader = req.headers["authorization"] as string | undefined;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    (req as any).userId = decoded.userId;
    if (!(req as any).session) {
      (req as any).session = {};
    }
    (req as any).session.userId = decoded.userId;
    return next();
  } catch (error) {
    console.warn("Invalid JWT token", error);
    return next();
  }
};
