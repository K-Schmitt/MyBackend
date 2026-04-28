import { session, user } from "@/db/schema/auth.schema.js";
import { userProfile } from "@/db/schema/users.schema.js";
import { db } from "@/lib/db.js";
import * as auditService from "@/services/audit.service.js";
import { type UserProfile, profileColumns } from "@/services/user.service.js";
import type { ListUsersQuery, UpdateRoleBody } from "@/types/admin.types.js";
import { NotFoundError } from "@/utils/errors.js";
import { count, eq } from "drizzle-orm";

export function listUsers(query: ListUsersQuery): { users: UserProfile[]; total: number } {
  const { page, limit } = query;
  const offset = (page - 1) * limit;

  const users = db
    .select(profileColumns)
    .from(userProfile)
    .innerJoin(user, eq(userProfile.userId, user.id))
    .limit(limit)
    .offset(offset)
    .all();

  const totalResult = db.select({ total: count() }).from(userProfile).get();

  return { users, total: totalResult?.total ?? 0 };
}

export function updateUserRole(
  profileId: string,
  body: UpdateRoleBody,
  adminId: string,
  ip: string,
  requestId?: string,
): void {
  const existing = db
    .select({ id: userProfile.id })
    .from(userProfile)
    .where(eq(userProfile.id, profileId))
    .get();
  if (!existing) throw new NotFoundError("UserProfile");

  db.update(userProfile)
    .set({ role: body.role, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(userProfile.id, profileId))
    .run();

  auditService.log("admin.role_updated", adminId, { profileId, role: body.role }, ip, requestId);
}

export function adminDeleteUser(
  profileId: string,
  adminId: string,
  ip: string,
  requestId?: string,
): void {
  const existing = db
    .select({ userId: userProfile.userId })
    .from(userProfile)
    .where(eq(userProfile.id, profileId))
    .get();
  if (!existing) throw new NotFoundError("UserProfile");

  const { userId } = existing;

  db.transaction((tx) => {
    tx.delete(session).where(eq(session.userId, userId)).run();
    tx.delete(userProfile).where(eq(userProfile.id, profileId)).run();
    tx.delete(user).where(eq(user.id, userId)).run();
  });

  auditService.log("admin.user_deleted", adminId, { profileId, userId }, ip, requestId);
}
