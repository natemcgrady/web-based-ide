import { env } from "@/lib/env";
import type { SessionRecord } from "@/lib/contracts/sandbox";
import { createSandbox, getSandbox } from "@/lib/sandbox/client";
import { sessionStore } from "@/lib/sandbox/session-store";

const SESSION_TTL_SECONDS = Math.floor(env.SANDBOX_MAX_LIFETIME_MS / 1000);

function nowIso() {
  return new Date().toISOString();
}

function dateAfter(ms: number) {
  return new Date(Date.now() + ms).toISOString();
}

function nextStatus(record: SessionRecord): SessionRecord["status"] {
  if (record.status === "creating") {
    return "ready";
  }
  return record.status;
}

export async function createSession({
  projectId,
  userId,
}: {
  projectId: string;
  userId: string;
}) {
  const sandbox = await createSandbox({
    timeout: env.SANDBOX_TIMEOUT_MS,
    ports: [3000, 3001, 4173, 5173],
  });

  const current = nowIso();
  const session: SessionRecord = {
    sessionId: crypto.randomUUID(),
    projectId,
    userId,
    sandboxId: sandbox.sandboxId,
    status: "ready",
    cwd: "/vercel/sandbox",
    createdAt: current,
    updatedAt: current,
    expiresAt: dateAfter(env.SANDBOX_MAX_LIFETIME_MS),
    previewPort: 3000,
  };

  await sessionStore.upsert(session, SESSION_TTL_SECONDS);
  return session;
}

export async function getSession(sessionId: string) {
  const session = await sessionStore.get(sessionId);
  if (!session) {
    return null;
  }

  const updated: SessionRecord = {
    ...session,
    status: nextStatus(session),
  };
  await sessionStore.upsert(updated, SESSION_TTL_SECONDS);
  return updated;
}

export async function listUserSessions(userId: string) {
  const sessions = await sessionStore.listByUser(userId);
  return sessions.filter((session) => session.status !== "terminated");
}

export async function touchSession(sessionId: string) {
  const session = await sessionStore.get(sessionId);
  if (!session) {
    return null;
  }

  const updated: SessionRecord = {
    ...session,
    updatedAt: nowIso(),
  };
  await sessionStore.upsert(updated, SESSION_TTL_SECONDS);
  return updated;
}

export async function updateSession(
  sessionId: string,
  updates: Partial<SessionRecord>,
) {
  const session = await sessionStore.get(sessionId);
  if (!session) {
    return null;
  }

  const updated: SessionRecord = {
    ...session,
    ...updates,
    updatedAt: nowIso(),
  };

  await sessionStore.upsert(updated, SESSION_TTL_SECONDS);
  return updated;
}

export async function terminateSession(sessionId: string) {
  const session = await sessionStore.get(sessionId);
  if (!session) {
    return null;
  }

  const sandbox = await getSandbox(session.sandboxId);
  await sandbox.stop({ blocking: true });
  const updated = await updateSession(sessionId, { status: "terminated" });
  await sessionStore.remove(sessionId, session.userId);
  return updated;
}

export async function enforceUserSessionQuota(userId: string) {
  const sessions = await listUserSessions(userId);
  if (sessions.length < env.SANDBOX_MAX_ACTIVE_PER_USER) {
    return;
  }
  throw new Error(
    `Reached max active sessions (${env.SANDBOX_MAX_ACTIVE_PER_USER}) for this user.`,
  );
}

export async function cleanupExpiredSessions() {
  const all = await sessionStore.all();
  const now = Date.now();

  await Promise.all(
    all.map(async (session) => {
      const createdAt = new Date(session.createdAt).getTime();
      const updatedAt = new Date(session.updatedAt).getTime();
      const isPastMaxLifetime =
        now - createdAt > env.SANDBOX_MAX_LIFETIME_MS ||
        now > new Date(session.expiresAt).getTime();
      const isIdle = now - updatedAt > env.SANDBOX_IDLE_TIMEOUT_MS;

      if (!isPastMaxLifetime && !isIdle) {
        return;
      }

      try {
        const sandbox = await getSandbox(session.sandboxId);
        await sandbox.stop({ blocking: true });
      } catch {
        // If sandbox is already gone we still clear session state.
      }

      await sessionStore.remove(session.sessionId, session.userId);
    }),
  );
}
