import { deleteUser, getUserByAuthId, updateUserProfile } from "@/services/user.service.js";
import type { AppVariables } from "@/types/hono.types.js";
import type { UpdateUserProfileInput } from "@/types/user.types.js";
import { NotFoundError } from "@/utils/errors.js";
import { getClientIp } from "@/utils/request.js";
import { ok } from "@/utils/response.js";
import type { Context } from "hono";

export async function getMe(c: Context<{ Variables: AppVariables }>) {
  const profile = await getUserByAuthId(c.var.user.id);
  if (!profile) throw new NotFoundError("UserProfile");
  return c.json(ok(profile));
}

export async function updateMe(
  c: Context<{ Variables: AppVariables }>,
  data: UpdateUserProfileInput,
) {
  const profile = await updateUserProfile(c.var.user.id, data);
  return c.json(ok(profile));
}

export async function deleteMe(c: Context<{ Variables: AppVariables }>) {
  await deleteUser(c.var.user.id, getClientIp(c), c.var.requestId);
  return c.body(null, 204);
}
