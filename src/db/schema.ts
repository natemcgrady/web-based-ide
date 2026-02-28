import { pgTable, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const projectFiles = pgTable("project_files", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  path: text("path").notNull(),
  content: text("content").notNull(),
  isDir: boolean("is_dir").notNull().default(false),
  hash: text("hash").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const sandboxSessions = pgTable("sandbox_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  projectId: text("project_id").notNull(),
  sandboxId: text("sandbox_id").notNull(),
  status: text("status").notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
