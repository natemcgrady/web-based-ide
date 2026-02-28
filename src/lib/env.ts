import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  VERCEL_OIDC_TOKEN: z.string().optional(),
  VERCEL_SANDBOX_TOKEN: z.string().optional(),
  VERCEL_SANDBOX_PROJECT_ID: z.string().optional(),
  VERCEL_SANDBOX_TEAM_ID: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  SANDBOX_TIMEOUT_MS: z.coerce.number().default(30 * 60 * 1000),
  SANDBOX_MAX_LIFETIME_MS: z.coerce.number().default(2 * 60 * 60 * 1000),
  SANDBOX_IDLE_TIMEOUT_MS: z.coerce.number().default(25 * 60 * 1000),
  SANDBOX_MAX_ACTIVE_PER_USER: z.coerce.number().default(2),
  TERMINAL_MAX_COMMAND_LENGTH: z.coerce.number().default(4000),
});

export const env = envSchema.parse(process.env);

export const hasRedis = Boolean(
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN,
);

export const hasSandboxCredentials = Boolean(
  env.VERCEL_OIDC_TOKEN ||
    (env.VERCEL_SANDBOX_TOKEN &&
      env.VERCEL_SANDBOX_PROJECT_ID &&
      env.VERCEL_SANDBOX_TEAM_ID),
);
