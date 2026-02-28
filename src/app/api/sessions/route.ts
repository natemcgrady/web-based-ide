import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth/user";
import { createSession, enforceUserSessionQuota, listUserSessions } from "@/lib/sandbox/session-service";
import { createSessionRequestSchema } from "@/lib/contracts/sandbox";
import { jsonError } from "@/lib/http";
import { logAuditEvent } from "@/lib/audit/events";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  const sessions = await listUserSessions(user.id);
  return NextResponse.json({ sessions });
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    await enforceUserSessionQuota(user.id);

    const body = await request.json();
    const { projectId } = createSessionRequestSchema.parse(body);
    const session = await createSession({ projectId, userId: user.id });

    logAuditEvent({
      type: "session.create",
      actorId: user.id,
      sessionId: session.sessionId,
      projectId,
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? "Invalid request body.");
    }
    return jsonError(
      error instanceof Error ? error.message : "Failed to create session.",
      500,
    );
  }
}
