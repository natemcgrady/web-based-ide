import { Sandbox } from "@vercel/sandbox";
import { env } from "@/lib/env";

export function sandboxAuthParams() {
  if (env.VERCEL_OIDC_TOKEN) {
    return {};
  }

  if (
    env.VERCEL_SANDBOX_TOKEN &&
    env.VERCEL_SANDBOX_PROJECT_ID &&
    env.VERCEL_SANDBOX_TEAM_ID
  ) {
    return {
      token: env.VERCEL_SANDBOX_TOKEN,
      projectId: env.VERCEL_SANDBOX_PROJECT_ID,
      teamId: env.VERCEL_SANDBOX_TEAM_ID,
    };
  }

  throw new Error(
    "Missing Vercel Sandbox credentials. Configure VERCEL_OIDC_TOKEN or VERCEL_SANDBOX_TOKEN + VERCEL_SANDBOX_PROJECT_ID + VERCEL_SANDBOX_TEAM_ID.",
  );
}

export async function createSandbox({
  timeout,
  ports,
}: {
  timeout: number;
  ports: number[];
}) {
  return Sandbox.create({
    ...sandboxAuthParams(),
    timeout,
    ports,
    runtime: "node24",
  });
}

export async function getSandbox(sandboxId: string) {
  return Sandbox.get({
    ...sandboxAuthParams(),
    sandboxId,
  });
}
