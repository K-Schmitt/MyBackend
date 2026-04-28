import { env } from "@/lib/env.js";
import type { AppVariables } from "@/types/hono.types.js";
import { createMiddleware } from "hono/factory";
import { ulid } from "ulid";

export const requestIdMiddleware = createMiddleware<{ Variables: AppVariables }>(
  async (c, next) => {
    const id = env.FORCE_REQUEST_ID ?? ulid();
    c.set("requestId", id);
    c.header("X-Request-Id", id);
    await next();
  },
);
