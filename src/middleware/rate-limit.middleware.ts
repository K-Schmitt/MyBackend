import { AppError } from "@/utils/errors.js";
import { createMiddleware } from "hono/factory";

type WindowEntry = { count: number; resetAt: number };

const allStores: Map<string, WindowEntry>[] = [];

export function clearRateLimitStores(): void {
  for (const store of allStores) store.clear();
}

const createRateLimiter = (maxRequests: number, windowMs: number) => {
  const store = new Map<string, WindowEntry>();
  allStores.push(store);

  // Purge expired entries every windowMs to prevent unbounded memory growth
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) store.delete(key);
    }
  }, windowMs);

  return createMiddleware(async (c, next) => {
    const key =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip") ??
      "unknown";

    const now = Date.now();
    const entry = store.get(key);

    if (entry === undefined || now >= entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      entry.count += 1;
      if (entry.count > maxRequests) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        c.header("Retry-After", String(retryAfter));
        throw new AppError("RATE_LIMIT_EXCEEDED", "Too many requests", 429);
      }
    }

    await next();
  });
};

export const authRateLimiter = createRateLimiter(60, 15 * 60 * 1000);
export const loginRateLimiter = createRateLimiter(5, 15 * 60 * 1000);
