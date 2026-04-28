import { USER_ROLES } from "@/db/schema/users.schema.js";
import { z } from "zod";

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateRoleBodySchema = z.object({
  role: z.enum(USER_ROLES),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UpdateRoleBody = z.infer<typeof updateRoleBodySchema>;
