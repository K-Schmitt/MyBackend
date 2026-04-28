import { getUserRole } from "@/services/user.service.js";
import type { AppVariables } from "@/types/hono.types.js";
import type { Role } from "@/types/roles.types.js";
import { AppError } from "@/utils/errors.js";
import { createMiddleware } from "hono/factory";

export const requireRole = (...roles: Role[]) =>
  createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
    const role = getUserRole(c.var.user.id);

    if (!role || !roles.some((r) => r === role)) {
      throw new AppError("FORBIDDEN", "Insufficient permissions", 403);
    }

    await next();
  });
