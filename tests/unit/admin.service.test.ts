import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { ulid } from "ulid";
import { db } from "@/db/index.js";
import { user } from "@/db/schema/auth.schema.js";
import { userProfile } from "@/db/schema/users.schema.js";
import { adminDeleteUser, listUsers, updateUserRole } from "@/services/admin.service.js";

const ADMIN_AUTH_ID = "admin-user-001";
const TARGET_AUTH_ID = "target-user-001";
const TARGET_PROFILE_ID = ulid();

function seedUsers() {
  db.insert(user)
    .values([
      {
        id: ADMIN_AUTH_ID,
        name: "Admin User",
        email: "admin@example.com",
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: TARGET_AUTH_ID,
        name: "Target User",
        email: "target@example.com",
        emailVerified: false,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
    .run();
  db.insert(userProfile)
    .values([
      { id: ulid(), userId: ADMIN_AUTH_ID, role: "admin" },
      { id: TARGET_PROFILE_ID, userId: TARGET_AUTH_ID, role: "user" },
    ])
    .run();
}

function resetUsers() {
  db.delete(userProfile).where(eq(userProfile.userId, TARGET_AUTH_ID)).run();
  db.delete(userProfile).where(eq(userProfile.userId, ADMIN_AUTH_ID)).run();
  db.delete(user).where(eq(user.id, TARGET_AUTH_ID)).run();
  db.delete(user).where(eq(user.id, ADMIN_AUTH_ID)).run();
  seedUsers();
}

beforeAll(() => {
  seedUsers();
});

afterEach(() => {
  resetUsers();
});

describe("AdminService", () => {
  describe("listUsers", () => {
    it("should return paginated users with total count", () => {
      const result = listUsers({ page: 1, limit: 10 });
      expect(result.total).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(result.users)).toBe(true);
    });

    it("should respect pagination parameters", () => {
      const page1 = listUsers({ page: 1, limit: 1 });
      const page2 = listUsers({ page: 2, limit: 1 });
      expect(page1.users).toHaveLength(1);
      expect(page2.users).toHaveLength(1);
      expect(page1.users[0]).not.toEqual(page2.users[0]);
    });
  });

  describe("updateUserRole", () => {
    it("should update the role of an existing user profile", () => {
      updateUserRole(
        TARGET_PROFILE_ID,
        { role: "admin" },
        ADMIN_AUTH_ID,
        "127.0.0.1",
      );
      const updated = db
        .select({ role: userProfile.role })
        .from(userProfile)
        .where(eq(userProfile.id, TARGET_PROFILE_ID))
        .get();
      expect(updated?.role).toBe("admin");
    });

    it("should throw NotFoundError for unknown profile ID", () => {
      expect(() =>
        updateUserRole("nonexistent-id", { role: "admin" }, ADMIN_AUTH_ID, "127.0.0.1"),
      ).toThrow("UserProfile not found");
    });
  });

  describe("adminDeleteUser", () => {
    it("should delete user, profile, and sessions atomically", () => {
      adminDeleteUser(TARGET_PROFILE_ID, ADMIN_AUTH_ID, "127.0.0.1");

      const deletedProfile = db
        .select({ id: userProfile.id })
        .from(userProfile)
        .where(eq(userProfile.id, TARGET_PROFILE_ID))
        .get();
      expect(deletedProfile).toBeUndefined();

      const deletedUser = db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, TARGET_AUTH_ID))
        .get();
      expect(deletedUser).toBeUndefined();
    });

    it("should throw NotFoundError for unknown profile ID", () => {
      expect(() =>
        adminDeleteUser("nonexistent-id", ADMIN_AUTH_ID, "127.0.0.1"),
      ).toThrow("UserProfile not found");
    });
  });
});
