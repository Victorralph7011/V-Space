import 'server-only';

/**
 * A per-uid token bucket, held in the function instance's memory.
 *
 * This is not what you would reach for behind a product with thousands of
 * concurrent users — a serverless instance's memory is not shared across
 * regions or cold starts, so the limit is really "per warm instance," and a
 * determined caller could exceed it by fanning out. For a single-user free-
 * tier archive, that gap does not matter: the entire point of the limit is to
 * stop *this account's* runaway loop (a bug in the client retrying forever)
 * from burning through the free Gemini quota before anyone notices, and an
 * in-memory bucket does that without paying for Redis to protect one person's
 * hobby project.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count++;
  return { allowed: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}
