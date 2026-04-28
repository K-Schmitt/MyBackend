import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { ulid } from "ulid";
import { db } from "@/db/index.js";
import { user } from "@/db/schema/auth.schema.js";
import { userProfile } from "@/db/schema/users.schema.js";
import {
  createUserProfile,
  deleteUser,
  getUserByAuthId,
  getUserById,
  updateUserProfile,
} from "@/services/user.service.js";

const TEST_AUTH_ID = "test-auth-user-001";
const TEST_PROFILE_ID = ulid();

function seedUser() {
  db.insert(user)
    .values({
      id: TEST_AUTH_ID,
      name: "Test User",
      email: "test@example.com",
      emailVerified: false,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .run();
  db.insert(userProfile)
    .values({ id: TEST_PROFILE_ID, userId: TEST_AUTH_ID })
    .run();
}

function resetUser() {
  db.delete(userProfile).where(eq(userProfile.userId, TEST_AUTH_ID)).run();
  db.delete(user).where(eq(user.id, TEST_AUTH_ID)).run();
  seedUser();
}

beforeAll(() => {
  seedUser();
});

afterEach(() => {
  resetUser();
});

describe("UserService", () => {
  describe("getUserById", () => {
    it("should return the profile when found by ULID", async () => {
      const profile = await getUserById(TEST_PROFILE_ID);
      expect(profile).not.toBeNull();
      expect(profile?.id).toBe(TEST_PROFILE_ID);
      expect(profile?.email).toBe("test@example.com");
      expect(profile?.role).toBe("user");
    });

    it("should return null when profile not found", async () => {
      const profile = await getUserById("nonexistent-ulid");
      expect(profile).toBeNull();
    });
  });

  describe("getUserByAuthId", () => {
    it("should return the profile when found by auth user ID", async () => {
      const profile = await getUserByAuthId(TEST_AUTH_ID);
      expect(profile).not.toBeNull();
      expect(profile?.userId).toBe(TEST_AUTH_ID);
      expect(profile?.name).toBe("Test User");
    });

    it("should return null for unknown auth user ID", async () => {
      const profile = await getUserByAuthId("unknown-auth-id");
      expect(profile).toBeNull();
    });
  });

  describe("createUserProfile", () => {
    it("should create a profile for a new auth user", async () => {
      const newAuthId = "new-auth-user-002";
      db.insert(user)
        .values({
          id: newAuthId,
          name: "New User",
          email: "new@example.com",
          emailVerified: false,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .run();

      createUserProfile(newAuthId);

      const profile = await getUserByAuthId(newAuthId);
      expect(profile).not.toBeNull();
      expect(profile?.role).toBe("user");

      db.delete(user).where(eq(user.id, newAuthId)).run();
    });
  });

  describe("updateUserProfile", () => {
    it("should update the name on the auth user", async () => {
      const updated = await updateUserProfile(TEST_AUTH_ID, { name: "Updated Name" });
      expect(updated.name).toBe("Updated Name");
    });

    it("should update bio and avatarUrl on user_profile", async () => {
      const updated = await updateUserProfile(TEST_AUTH_ID, {
        bio: "Hello world",
        avatarUrl: "https://example.com/avatar.png",
      });
      expect(updated.bio).toBe("Hello world");
      expect(updated.avatarUrl).toBe("https://example.com/avatar.png");
    });

    it("should update updatedAt timestamp when profile fields change", async () => {
      const before = await getUserByAuthId(TEST_AUTH_ID);
      await new Promise((r) => setTimeout(r, 1100));
      await updateUserProfile(TEST_AUTH_ID, { bio: "New bio" });
      const after = await getUserByAuthId(TEST_AUTH_ID);
      expect(after!.updatedAt).toBeGreaterThan(before!.updatedAt);
    });

    it("should throw NotFoundError for unknown auth user", async () => {
      await expect(updateUserProfile("unknown", { name: "X" })).rejects.toThrow(
        "UserProfile not found",
      );
    });
  });

  describe("deleteUser", () => {
    it("should delete user_profile and user in a transaction", async () => {
      await deleteUser(TEST_AUTH_ID, "127.0.0.1");

      const deletedProfile = await getUserByAuthId(TEST_AUTH_ID);
      expect(deletedProfile).toBeNull();

      const deletedUser = db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, TEST_AUTH_ID))
        .get();
      expect(deletedUser).toBeUndefined();
    });

    it("should throw NotFoundError when user does not exist", async () => {
      await expect(deleteUser("nonexistent", "127.0.0.1")).rejects.toThrow("User not found");
    });
  });
});
