import { getUsers, removeUser, updateRole } from "@/controllers/admin.controller.js";
import { requireAuth } from "@/middleware/auth.middleware.js";
import { requireRole } from "@/middleware/require-role.middleware.js";
import { listUsersQuerySchema, updateRoleBodySchema } from "@/types/admin.types.js";
import type { AppVariables } from "@/types/hono.types.js";
import { ValidationError } from "@/utils/errors.js";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

export const adminRoutes = new Hono<{ Variables: AppVariables }>();

adminRoutes.get(
  "/users",
  requireAuth,
  requireRole("admin"),
  zValidator("query", listUsersQuerySchema, (result) => {
    if (!result.success) throw new ValidationError(result.error.issues);
  }),
  (c) => getUsers(c, c.req.valid("query")),
);

adminRoutes.patch(
  "/users/:id/role",
  requireAuth,
  requireRole("admin"),
  zValidator("json", updateRoleBodySchema, (result) => {
    if (!result.success) throw new ValidationError(result.error.issues);
  }),
  (c) => updateRole(c, c.req.param("id"), c.req.valid("json")),
);

adminRoutes.delete("/users/:id", requireAuth, requireRole("admin"), (c) =>
  removeUser(c, c.req.param("id")),
);
