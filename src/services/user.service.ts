import { session, user } from "@/db/schema/auth.schema.js";
import { type UserRole, userProfile } from "@/db/schema/users.schema.js";
import { db } from "@/lib/db.js";
import * as auditService from "@/services/audit.service.js";
import type { UpdateUserProfileInput } from "@/types/user.types.js";
import { NotFoundError } from "@/utils/errors.js";
import { eq } from "drizzle-orm";
import { ulid } from "ulid";

export const profileColumns = {
  id: userProfile.id,
  userId: userProfile.userId,
  role: userProfile.role,
  avatarUrl: userProfile.avatarUrl,
  bio: userProfile.bio,
  createdAt: userProfile.createdAt,
  updatedAt: userProfile.updatedAt,
  name: user.name,
  email: user.email,
  emailVerified: user.emailVerified,
  image: user.image,
  // `as const` : force l'inférence de types colonnes Drizzle pour le select typé
} as const;

export type UserProfile = {
  id: string;
  userId: string;
  role: UserRole;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: number;
  updatedAt: number;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
};

export function createUserProfile(authUserId: string): void {
  db.insert(userProfile).values({ id: ulid(), userId: authUserId }).run();
}

export function getUserRole(authUserId: string): UserRole | null {
  const result = db
    .select({ role: userProfile.role })
    .from(userProfile)
    .where(eq(userProfile.userId, authUserId))
    .get();
  return result?.role ?? null;
}

export async function getUserById(id: string): Promise<UserProfile | null> {
  const result = db
    .select(profileColumns)
    .from(userProfile)
    .innerJoin(user, eq(userProfile.userId, user.id))
    .where(eq(userProfile.id, id))
    .get();
  return result ?? null;
}

export async function getUserByAuthId(authUserId: string): Promise<UserProfile | null> {
  const result = db
    .select(profileColumns)
    .from(userProfile)
    .innerJoin(user, eq(userProfile.userId, user.id))
    .where(eq(userProfile.userId, authUserId))
    .get();
  return result ?? null;
}

export async function updateUserProfile(
  authUserId: string,
  data: UpdateUserProfileInput,
): Promise<UserProfile> {
  const existing = await getUserByAuthId(authUserId);
  if (!existing) throw new NotFoundError("UserProfile");

  const now = Math.floor(Date.now() / 1000);
  const { name, bio, avatarUrl } = data;

  db.transaction((tx) => {
    if (name !== undefined) {
      tx.update(user).set({ name }).where(eq(user.id, authUserId)).run();
    }
    if (bio !== undefined || avatarUrl !== undefined) {
      tx.update(userProfile)
        .set({
          ...(bio !== undefined && { bio }),
          ...(avatarUrl !== undefined && { avatarUrl }),
          updatedAt: now,
        })
        .where(eq(userProfile.userId, authUserId))
        .run();
    }
  });

  const updated = await getUserByAuthId(authUserId);
  if (!updated) throw new NotFoundError("UserProfile");
  return updated;
}

export async function deleteUser(
  authUserId: string,
  ip: string,
  requestId?: string,
): Promise<void> {
  const existing = await getUserByAuthId(authUserId);
  if (!existing) throw new NotFoundError("User");

  db.transaction((tx) => {
    tx.delete(session).where(eq(session.userId, authUserId)).run();
    tx.delete(userProfile).where(eq(userProfile.userId, authUserId)).run();
    tx.delete(user).where(eq(user.id, authUserId)).run();
  });

  auditService.log("user.deleted", authUserId, {}, ip, requestId);
}
