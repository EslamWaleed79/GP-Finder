import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  real,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["student", "admin"]);

export const projectStatusEnum = pgEnum("project_status", [
  "open",
  "closed",
]);

export const connectStatusEnum = pgEnum("connect_status", [
  "pending",
  "accepted",
  "declined",
]);

export const userTrackEnum = pgEnum("user_track", [
  "Software Engineering",
  "Hardware Design",
  "Networks and Cybersecurity",
  "AI",
  "Embedded",
  "Other",
]);

export const bylawEnum = pgEnum("bylaw", ["2018", "2023"]);

export const genderEnum = pgEnum("gender", ["Male", "Female"]);

export const appStatusEnum = pgEnum("app_status", [
  "pending",
  "accepted",
  "rejected",
  "left",
  "removed",
]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  major: text("major").notNull(),
  skills: text("skills")
    .array()
    .notNull()
    .$default(() => []),
  bio: text("bio").notNull(),
  phone: text("phone"),
  universityId: text("university_id").notNull(),
  gpa: real("gpa"),
  bylaw: bylawEnum("bylaw"),
  track: userTrackEnum("track"),
  customTrack: text("custom_track"),
  gender: genderEnum("gender"),
  role: userRoleEnum("role").notNull().default("student"),
  cvLink: text("cv_link"),
  isVerified: boolean("is_verified").notNull().default(false),
  verificationCode: varchar("verification_code", { length: 6 }),
  verificationExpires: timestamp("verification_expires"),
  verificationRequestedAt: timestamp("verification_requested_at"),
  verificationAttempts: integer("verification_attempts").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  requiredSkills: text("required_skills")
    .array()
    .notNull()
    .$default(() => []),
  status: projectStatusEnum("status").notNull().default("open"),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  leaderId: integer("leader_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  track: userTrackEnum("track"),
  teamSizeCap: integer("team_size_cap").notNull().default(5),
  maxMembers: integer("max_members").notNull().default(5),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const connectRequestsTable = pgTable("connect_requests", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  recipientId: integer("recipient_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projectsTable.id, {
    onDelete: "set null",
  }),
  status: connectStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const projectApplicationsTable = pgTable("project_applications", {
  id: serial("id").primaryKey(),
  applicantId: integer("applicant_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  status: appStatusEnum("status").notNull().default("pending"),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  decidedAt: timestamp("decided_at"),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
export type Project = typeof projectsTable.$inferSelect;
export type InsertProject = typeof projectsTable.$inferInsert;
export type ConnectRequest = typeof connectRequestsTable.$inferSelect;
export type InsertConnectRequest = typeof connectRequestsTable.$inferInsert;
export type Notification = typeof notificationsTable.$inferSelect;
export type InsertNotification = typeof notificationsTable.$inferInsert;
export type ProjectApplication = typeof projectApplicationsTable.$inferSelect;
export type InsertProjectApplication =
  typeof projectApplicationsTable.$inferInsert;
