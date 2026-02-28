import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth/user";
import { jsonError } from "@/lib/http";
import { getSession } from "@/lib/sandbox/session-service";
import { terminalInputSchema } from "@/lib/contracts/sandbox";
import { assertSessionOwnership } from "@/lib/security/policies";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { runTerminalCommand } from "@/lib/sandbox/terminal-service";

export const runtime = "nodejs";

type Context = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function POST(request: NextRequest, context: Context) {
  const { sessionId } = await context.params;
  const user = getUserFromRequest(request);

  try {
    enforceRateLimit({
      key: `terminal:${user.id}:${sessionId}`,
      limit: 20,
      windowMs: 10_000,
    });

    const body = await request.json();
    const payload = terminalInputSchema.parse(body);

    const session = await getSession(sessionId);
    if (!session) {
      return jsonError("Session not found.", 404);
    }

    assertSessionOwnership(user.id, session.userId);

    const result = await runTerminalCommand({
      session,
      command: payload.command,
      actorId: user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? "Invalid command payload.");
    }
    return jsonError(
      error instanceof Error ? error.message : "Failed to execute terminal command.",
      500,
    );
  }
}
