import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/user";
import { getSession } from "@/lib/sandbox/session-service";
import { assertSessionOwnership } from "@/lib/security/policies";
import { jsonError } from "@/lib/http";
import { getPreviewStatus } from "@/lib/sandbox/preview-service";

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
    const status = await getPreviewStatus(session);
    return NextResponse.json(status);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to fetch preview status.",
      500,
    );
  }
}
