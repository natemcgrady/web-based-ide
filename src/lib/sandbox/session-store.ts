import { Redis } from "@upstash/redis";
import { hasRedis } from "@/lib/env";
import type { SessionRecord } from "@/lib/contracts/sandbox";

const KEY_PREFIX = "web-ide:sessions:";
const USER_INDEX_PREFIX = "web-ide:sessions:user:";

type SessionStore = {
  get(sessionId: string): Promise<SessionRecord | null>;
  listByUser(userId: string): Promise<SessionRecord[]>;
  upsert(session: SessionRecord, ttlSeconds: number): Promise<void>;
  remove(sessionId: string, userId: string): Promise<void>;
  all(): Promise<SessionRecord[]>;
};

class MemorySessionStore implements SessionStore {
  private readonly records = new Map<string, SessionRecord>();
  private readonly userIndex = new Map<string, Set<string>>();

  async get(sessionId: string) {
    return this.records.get(sessionId) ?? null;
  }

  async listByUser(userId: string) {
    const ids = this.userIndex.get(userId);
    if (!ids) {
      return [];
    }

    return Array.from(ids)
      .map((id) => this.records.get(id))
      .filter((record): record is SessionRecord => Boolean(record));
  }

  async upsert(session: SessionRecord) {
    this.records.set(session.sessionId, session);

    const ids = this.userIndex.get(session.userId) ?? new Set<string>();
    ids.add(session.sessionId);
    this.userIndex.set(session.userId, ids);
  }

  async remove(sessionId: string, userId: string) {
    this.records.delete(sessionId);
    const ids = this.userIndex.get(userId);
    if (!ids) {
      return;
    }
    ids.delete(sessionId);
    if (ids.size === 0) {
      this.userIndex.delete(userId);
    }
  }

  async all() {
    return Array.from(this.records.values());
  }
}

class RedisSessionStore implements SessionStore {
  private readonly redis = Redis.fromEnv();

  async get(sessionId: string) {
    return this.redis.get<SessionRecord>(`${KEY_PREFIX}${sessionId}`);
  }

  async listByUser(userId: string) {
    const ids = await this.redis.smembers<string[]>(
      `${USER_INDEX_PREFIX}${userId}`,
    );
    if (!ids.length) {
      return [];
    }
    const sessions = await Promise.all(ids.map((id) => this.get(id)));
    return sessions.filter((record): record is SessionRecord => Boolean(record));
  }

  async upsert(session: SessionRecord, ttlSeconds: number) {
    await Promise.all([
      this.redis.set(`${KEY_PREFIX}${session.sessionId}`, session, {
        ex: ttlSeconds,
      }),
      this.redis.sadd(`${USER_INDEX_PREFIX}${session.userId}`, session.sessionId),
      this.redis.expire(`${USER_INDEX_PREFIX}${session.userId}`, ttlSeconds),
    ]);
  }

  async remove(sessionId: string, userId: string) {
    await Promise.all([
      this.redis.del(`${KEY_PREFIX}${sessionId}`),
      this.redis.srem(`${USER_INDEX_PREFIX}${userId}`, sessionId),
    ]);
  }

  async all() {
    const keys = await this.redis.keys(`${KEY_PREFIX}*`);
    if (!keys.length) {
      return [];
    }
    const sessions = await Promise.all(
      keys.map((key) => this.redis.get<SessionRecord>(key)),
    );
    return sessions.filter((record): record is SessionRecord => Boolean(record));
  }
}

const store: SessionStore = hasRedis
  ? new RedisSessionStore()
  : new MemorySessionStore();

export const sessionStore = store;
