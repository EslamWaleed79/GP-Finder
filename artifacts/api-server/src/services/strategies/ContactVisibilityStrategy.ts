import type { User } from "@workspace/db";

export type ConnectStatus =
  | "none"
  | "pending_sent"
  | "pending_received"
  | "connected";

export interface ProfileViewResult {
  id: number;
  name: string;
  major: string;
  track: string | null;
  customTrack: string | null;
  gender: string | null;
  bylaw: string | null;
  skills: string[];
  bio: string | null;
  role: "student" | "admin";
  createdAt: Date;
  connectStatus: ConnectStatus;
  isVerified: boolean;
  cvLink?: string | null;
  // private fields — only present when connected or self
  email?: string | null;
  phone?: string | null;
  gpa?: number | null;
}

export interface IContactVisibilityStrategy {
  buildView(user: User, connectStatus: ConnectStatus): ProfileViewResult;
}

export class PublicViewStrategy implements IContactVisibilityStrategy {
  buildView(user: User, connectStatus: ConnectStatus): ProfileViewResult {
    return {
      id: user.id,
      name: user.name,
      major: user.major,
      track: user.track ?? null,
      customTrack: user.customTrack ?? null,
      gender: user.gender ?? null,
      bylaw: user.bylaw ?? null,
      skills: user.skills,
      bio: user.bio ?? null,
      role: user.role,
      createdAt: user.createdAt,
      connectStatus,
      isVerified: user.isVerified,
      cvLink: user.cvLink ?? null,
    };
  }
}

export class ConnectedViewStrategy implements IContactVisibilityStrategy {
  buildView(user: User, connectStatus: ConnectStatus): ProfileViewResult {
    return {
      id: user.id,
      name: user.name,
      major: user.major,
      track: user.track ?? null,
      customTrack: user.customTrack ?? null,
      gender: user.gender ?? null,
      bylaw: user.bylaw ?? null,
      skills: user.skills,
      bio: user.bio ?? null,
      role: user.role,
      createdAt: user.createdAt,
      connectStatus,
      isVerified: user.isVerified,
      email: user.email,
      phone: user.phone ?? null,
      gpa: user.gpa ?? null,
      cvLink: user.cvLink ?? null,
    };
  }
}

/** Used by /auth/me so the user always sees their own full data */
export class SelfViewStrategy implements IContactVisibilityStrategy {
  buildView(user: User, _connectStatus: ConnectStatus): ProfileViewResult {
    return {
      id: user.id,
      name: user.name,
      major: user.major,
      track: user.track ?? null,
      customTrack: user.customTrack ?? null,
      gender: user.gender ?? null,
      bylaw: user.bylaw ?? null,
      skills: user.skills,
      bio: user.bio ?? null,
      role: user.role,
      createdAt: user.createdAt,
      connectStatus: "none",
      isVerified: user.isVerified,
      email: user.email,
      phone: user.phone ?? null,
      gpa: user.gpa ?? null,
      cvLink: user.cvLink ?? null,
    };
  }
}

export class ContactVisibilityResolver {
  resolve(connectStatus: ConnectStatus): IContactVisibilityStrategy {
    if (connectStatus === "connected") {
      return new ConnectedViewStrategy();
    }
    return new PublicViewStrategy();
  }
}
