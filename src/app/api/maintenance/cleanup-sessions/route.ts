import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredSessions } from "@/lib/sandbox/session-service";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return jsonError("Unauthorized.", 401);
  }

  try {
    await cleanupExpiredSessions();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Cleanup failed.",
      500,
    );
  }
}
