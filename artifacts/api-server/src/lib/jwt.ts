import jwt, { type SignOptions } from "jsonwebtoken";

const resolvedSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
if (!resolvedSecret) {
  throw new Error("JWT_SECRET or SESSION_SECRET environment variable is required");
}

export const JWT_SECRET: string = resolvedSecret;

export function signJwt(payload: Record<string, unknown>, options: SignOptions = { expiresIn: "24h" }) {
  return jwt.sign(payload, JWT_SECRET, options);
}
