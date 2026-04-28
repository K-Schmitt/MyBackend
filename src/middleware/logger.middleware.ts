import { logger } from "@/lib/logger.js";
import type { AppVariables } from "@/types/hono.types.js";
import { createMiddleware } from "hono/factory";

export const loggerMiddleware = createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
  const start = Date.now();
  const { method } = c.req;
  const path = c.req.path;

  try {
    await next();
  } finally {
    const status = c.res.status;
    const ms = Date.now() - start;
    const requestId = c.get("requestId");

    const log = { method, path, status, ms, requestId };

    if (status >= 500) {
      logger.error(log, "request");
    } else if (status >= 400) {
      logger.warn(log, "request");
    } else {
      logger.info(log, "request");
    }
  }
});
