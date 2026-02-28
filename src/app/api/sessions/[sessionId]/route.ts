import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/user";
import { jsonError } from "@/lib/http";
import {
  getSession,
  terminateSession,
  touchSession,
} from "@/lib/sandbox/session-service";
import { assertSessionOwnership } from "@/lib/security/policies";
import { logAuditEvent } from "@/lib/audit/events";

export const runtime = "nodejs";

type Context = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function GET(request: NextRequest, context: Context) {
  const { sessionId } = await context.params;
  const user = getUserFromRequest(request);
  const session = await getSession(sessionId);
  if (!session) {
    return jsonError("Session not found.", 404);
  }
  try {
    assertSessionOwnership(user.id, session.userId);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Forbidden", 403);
  }
  return NextResponse.json({ session });
}

export async function PATCH(request: NextRequest, context: Context) {
  const { sessionId } = await context.params;
  const user = getUserFromRequest(request);
  const session = await getSession(sessionId);
  if (!session) {
    return jsonError("Session not found.", 404);
  }
  try {
    assertSessionOwnership(user.id, session.userId);
    const touched = await touchSession(sessionId);
    return NextResponse.json({ session: touched });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Forbidden", 403);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const { sessionId } = await context.params;
  const user = getUserFromRequest(request);
  const session = await getSession(sessionId);
  if (!session) {
    return jsonError("Session not found.", 404);
  }

  try {
    assertSessionOwnership(user.id, session.userId);
    await terminateSession(sessionId);
    logAuditEvent({
      type: "session.terminate",
      actorId: user.id,
      sessionId,
      projectId: session.projectId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to terminate session.",
      500,
    );
  }
}
