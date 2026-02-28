import { NextResponse } from "next/server";
import { hasRedis, hasSandboxCredentials } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    checks: {
      sandboxCredentials: hasSandboxCredentials,
      redisConfigured: hasRedis,
    },
    at: new Date().toISOString(),
  });
}
