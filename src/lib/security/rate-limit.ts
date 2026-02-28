type Counter = {
  count: number;
  resetAt: number;
};

const counters = new Map<string, Counter>();

export function enforceRateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const current = counters.get(key);

  if (!current || now > current.resetAt) {
    counters.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return;
  }

  if (current.count >= limit) {
    throw new Error("Rate limit exceeded.");
  }

  current.count += 1;
  counters.set(key, current);
}
