/**
 * Minimal in-memory fixed-window rate limiter. Good enough for a
 * single-instance deployment; swap for a Redis-backed limiter before
 * running multiple app instances behind a load balancer.
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

const DEFAULT_MAX = Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 20);
const DEFAULT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);

export function rateLimit(
  key: string,
  { max = DEFAULT_MAX, windowMs = DEFAULT_WINDOW_MS }: { max?: number; windowMs?: number } = {}
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { success: true, remaining: max - 1, resetAt };
  }

  if (bucket.count >= max) {
    return { success: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { success: true, remaining: max - bucket.count, resetAt: bucket.resetAt };
}

// Periodically sweep expired buckets so this map doesn't grow unbounded.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, 5 * 60_000).unref?.();
}
