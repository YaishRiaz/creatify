// Sliding-window in-memory rate limiter — per edge worker instance.
// For fully distributed rate limiting across all CF edge nodes, migrate to Upstash Redis.
// This still provides meaningful protection against most abuse patterns.

const store = new Map<string, number[]>()
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < 60_000) return
  lastCleanup = now
  for (const [key, timestamps] of store.entries()) {
    if (timestamps.length === 0 || now - timestamps[timestamps.length - 1] > 600_000) {
      store.delete(key)
    }
  }
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetMs: number
}

/**
 * Check if a request should be rate-limited.
 * @param key   Unique identifier (e.g. `signup:1.2.3.4` or `payout:user-uuid`)
 * @param limit Max requests allowed in the window
 * @param windowMs Rolling window duration in ms
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  cleanup()
  const now = Date.now()
  const windowStart = now - windowMs
  const timestamps = (store.get(key) ?? []).filter((ts) => ts > windowStart)

  if (timestamps.length >= limit) {
    const resetMs = Math.max(0, timestamps[0] + windowMs - now)
    return { allowed: false, remaining: 0, resetMs }
  }

  timestamps.push(now)
  store.set(key, timestamps)
  return { allowed: true, remaining: limit - timestamps.length, resetMs: windowMs }
}

/**
 * Extract the real client IP from Cloudflare / proxy headers.
 */
export function getClientIp(req: { headers: { get: (key: string) => string | null } }): string {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}
