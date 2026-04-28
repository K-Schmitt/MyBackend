import { adminDeleteUser, listUsers, updateUserRole } from "@/services/admin.service.js";
import type { ListUsersQuery, UpdateRoleBody } from "@/types/admin.types.js";
import type { AppVariables } from "@/types/hono.types.js";
import { getClientIp } from "@/utils/request.js";
import { ok } from "@/utils/response.js";
import type { Context } from "hono";

export function getUsers(c: Context<{ Variables: AppVariables }>, query: ListUsersQuery) {
  const { users, total } = listUsers(query);
  return c.json(ok(users, { page: query.page, total }));
}

export function updateRole(
  c: Context<{ Variables: AppVariables }>,
  profileId: string,
  body: UpdateRoleBody,
) {
  updateUserRole(profileId, body, c.var.user.id, getClientIp(c), c.var.requestId);
  return c.body(null, 204);
}

export function removeUser(c: Context<{ Variables: AppVariables }>, profileId: string) {
  adminDeleteUser(profileId, c.var.user.id, getClientIp(c), c.var.requestId);
  return c.body(null, 204);
}
