import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { env } from "@/lib/env";

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!env.DATABASE_URL) {
    return null;
  }
  if (dbInstance) {
    return dbInstance;
  }
  const sql = neon(env.DATABASE_URL);
  dbInstance = drizzle(sql);
  return dbInstance;
}
