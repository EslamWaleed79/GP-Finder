import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["student", "admin"]);
export const projectStatusEnum = pgEnum("project_status", [
  "open",
  "in_progress",
  "closed",
]);
export const connectStatusEnum = pgEnum("connect_status", [
  "pending",
  "accepted",
  "declined",
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
  bio: text("bio"),
  phone: text("phone"),
  role: userRoleEnum("role").notNull().default("student"),
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
  teamSizeCap: integer("team_size_cap").notNull().default(5),
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

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
export type Project = typeof projectsTable.$inferSelect;
export type InsertProject = typeof projectsTable.$inferInsert;
export type ConnectRequest = typeof connectRequestsTable.$inferSelect;
export type InsertConnectRequest = typeof connectRequestsTable.$inferInsert;
export type Notification = typeof notificationsTable.$inferSelect;
export type InsertNotification = typeof notificationsTable.$inferInsert;
