/*
 * Usage limits that protect the free model quota.
 *
 * Fixed windows held in memory: simple, and good enough for a demo on one
 * instance. With several instances each keeps its own count, so the real
 * limit is (instances × limit). For production, swap this for a shared store
 * such as Upstash Redis behind the same interface.
 */

export { MAX_MESSAGE_LENGTH } from "./constants";

export type LimitResult = { ok: true; remaining: number } | { ok: false; resetAt: Date };

export interface Limiter {
  take(key: string, now?: Date): LimitResult;
}

export function createFixedWindowLimiter({
  limit,
  windowMs,
  maxKeys = 10_000,
}: {
  limit: number;
  windowMs: number;
  maxKeys?: number;
}): Limiter {
  const windows = new Map<string, { start: number; count: number }>();

  return {
    take(key, now = new Date()) {
      const time = now.getTime();
      let window = windows.get(key);

      if (!window || time - window.start >= windowMs) {
        if (!window && windows.size >= maxKeys) {
          const oldest = windows.keys().next().value;
          if (oldest !== undefined) windows.delete(oldest);
        }
        window = { start: time, count: 0 };
        windows.set(key, window);
      }

      if (window.count >= limit) {
        return { ok: false, resetAt: new Date(window.start + windowMs) };
      }

      window.count++;
      return { ok: true, remaining: limit - window.count };
    },
  };
}

function envInt(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** Per visitor, per day. */
export const dailyLimiter = createFixedWindowLimiter({
  limit: envInt("DAILY_MESSAGE_LIMIT", 30),
  windowMs: 24 * 60 * 60 * 1000,
});

/**
 * Across everyone, per minute. Keeps us under Groq's free-tier rate limit so
 * one busy minute shows a friendly message instead of provider errors.
 */
export const globalLimiter = createFixedWindowLimiter({
  limit: envInt("GLOBAL_MESSAGES_PER_MINUTE", 25),
  windowMs: 60 * 1000,
});
