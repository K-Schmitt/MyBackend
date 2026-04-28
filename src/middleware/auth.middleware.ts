import { auth } from "@/lib/auth.js";
import type { AppVariables } from "@/types/hono.types.js";
import { AppError } from "@/utils/errors.js";
import { createMiddleware } from "hono/factory";

export const requireAuth = createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) throw new AppError("UNAUTHORIZED", "Authentication required", 401);
  c.set("session", session.session);
  c.set("user", session.user);
  await next();
});
