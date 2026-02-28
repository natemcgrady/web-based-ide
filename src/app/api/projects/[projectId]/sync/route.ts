import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth/user";
import { jsonError } from "@/lib/http";
import { getSession, touchSession } from "@/lib/sandbox/session-service";
import { assertSessionOwnership } from "@/lib/security/policies";
import { syncProjectFromSandbox, syncProjectToSandbox } from "@/lib/sandbox/file-sync";
import { syncRequestSchema } from "@/lib/contracts/sandbox";

export const runtime = "nodejs";

type Context = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function POST(request: NextRequest, context: Context) {
  const { projectId } = await context.params;
  const user = getUserFromRequest(request);

  try {
    const body = await request.json();
    const payload = syncRequestSchema.parse(body);
    const session = await getSession(payload.sessionId);

    if (!session) {
      return jsonError("Session not found.", 404);
    }

    assertSessionOwnership(user.id, session.userId);

    if (session.projectId !== projectId) {
      return jsonError("Session does not belong to this project.", 400);
    }

    const result =
      payload.direction === "to-sandbox"
        ? await syncProjectToSandbox(session)
        : await syncProjectFromSandbox(session);

    await touchSession(session.sessionId);
    return NextResponse.json({
      projectId,
      sessionId: session.sessionId,
      direction: payload.direction,
      ...result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? "Invalid request body.");
    }
    return jsonError(
      error instanceof Error ? error.message : "Sync failed.",
      500,
    );
  }
}
