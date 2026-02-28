import { z } from "zod";

export const sessionStatusSchema = z.enum([
  "creating",
  "ready",
  "busy",
  "idle",
  "terminating",
  "terminated",
  "error",
]);

export const sessionSchema = z.object({
  sessionId: z.string().uuid(),
  projectId: z.string(),
  userId: z.string(),
  sandboxId: z.string(),
  status: sessionStatusSchema,
  cwd: z.string().default("/vercel/sandbox"),
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string(),
  previewPort: z.number().default(3000),
  previewCommandId: z.string().optional(),
});

export type SessionRecord = z.infer<typeof sessionSchema>;

export const createSessionRequestSchema = z.object({
  projectId: z.string().min(1),
});

export const createSessionResponseSchema = z.object({
  session: sessionSchema,
});

export const fileEntrySchema = z.object({
  path: z.string().min(1),
  content: z.string().default(""),
  isDir: z.boolean().default(false),
  hash: z.string(),
  updatedAt: z.string(),
});

export type FileEntry = z.infer<typeof fileEntrySchema>;

export const filesListResponseSchema = z.object({
  projectId: z.string(),
  files: z.array(fileEntrySchema),
});

export const filesPatchSchema = z.object({
  files: z.array(
    z.object({
      path: z.string().min(1),
      content: z.string().default(""),
      isDir: z.boolean().default(false),
      operation: z.enum(["upsert", "delete"]),
    }),
  ),
});

export const syncRequestSchema = z.object({
  sessionId: z.string().uuid(),
  direction: z.enum(["to-sandbox", "from-sandbox"]).default("to-sandbox"),
});

export const terminalInputSchema = z.object({
  command: z.string().min(1),
});

export const terminalEventSchema = z.object({
  id: z.string(),
  sessionId: z.string().uuid(),
  stream: z.enum(["stdout", "stderr", "system"]),
  payload: z.string(),
  createdAt: z.string(),
});

export type TerminalEvent = z.infer<typeof terminalEventSchema>;
