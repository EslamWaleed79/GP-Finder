import type { User } from "@workspace/db";

export interface ProfileViewResult {
  id: number;
  name: string;
  major: string;
  skills: string[];
  bio: string | null;
  role: "student" | "admin";
  createdAt: Date;
  connectStatus: "none" | "pending_sent" | "pending_received" | "connected";
  email?: string | null;
  phone?: string | null;
}

export interface IContactVisibilityStrategy {
  buildView(
    user: User,
    connectStatus: "none" | "pending_sent" | "pending_received" | "connected"
  ): ProfileViewResult;
}

export class PublicViewStrategy implements IContactVisibilityStrategy {
  buildView(
    user: User,
    connectStatus: "none" | "pending_sent" | "pending_received" | "connected"
  ): ProfileViewResult {
    return {
      id: user.id,
      name: user.name,
      major: user.major,
      skills: user.skills,
      bio: user.bio ?? null,
      role: user.role,
      createdAt: user.createdAt,
      connectStatus,
    };
  }
}

export class ConnectedViewStrategy implements IContactVisibilityStrategy {
  buildView(
    user: User,
    connectStatus: "none" | "pending_sent" | "pending_received" | "connected"
  ): ProfileViewResult {
    return {
      id: user.id,
      name: user.name,
      major: user.major,
      skills: user.skills,
      bio: user.bio ?? null,
      role: user.role,
      createdAt: user.createdAt,
      connectStatus,
      email: user.email,
      phone: user.phone ?? null,
    };
  }
}

export class ContactVisibilityResolver {
  resolve(
    connectStatus: "none" | "pending_sent" | "pending_received" | "connected"
  ): IContactVisibilityStrategy {
    if (connectStatus === "connected") {
      return new ConnectedViewStrategy();
    }
    return new PublicViewStrategy();
  }
}
