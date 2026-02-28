import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/user";
import { getSession } from "@/lib/sandbox/session-service";
import { assertSessionOwnership } from "@/lib/security/policies";
import { jsonError } from "@/lib/http";
import { startPreview } from "@/lib/sandbox/preview-service";

export const runtime = "nodejs";
export const maxDuration = 60;

type Context = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function POST(request: NextRequest, context: Context) {
  const { sessionId } = await context.params;
  const user = getUserFromRequest(request);

  const session = await getSession(sessionId);
  if (!session) {
    return jsonError("Session not found.", 404);
  }

  try {
    assertSessionOwnership(user.id, session.userId);
    const preview = await startPreview({
      session,
      actorId: user.id,
    });
    return NextResponse.json(preview);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to start preview.",
      500,
    );
  }
}
