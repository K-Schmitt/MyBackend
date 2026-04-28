import { deleteMe, getMe, updateMe } from "@/controllers/user.controller.js";
import { requireAuth } from "@/middleware/auth.middleware.js";
import type { AppVariables } from "@/types/hono.types.js";
import { updateUserProfileSchema } from "@/types/user.types.js";
import { ValidationError } from "@/utils/errors.js";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

const userRoutes = new Hono<{ Variables: AppVariables }>();

userRoutes.get("/me", requireAuth, getMe);

userRoutes.patch(
  "/me",
  requireAuth,
  zValidator("json", updateUserProfileSchema, (result) => {
    if (!result.success) throw new ValidationError(result.error.issues);
  }),
  (c) => updateMe(c, c.req.valid("json")),
);

userRoutes.delete("/me", requireAuth, deleteMe);

export { userRoutes };
