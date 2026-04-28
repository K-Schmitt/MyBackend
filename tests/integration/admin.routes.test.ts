import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/index.js";
import { userProfile } from "@/db/schema/users.schema.js";
import { createAdminUser, signUpAndLogin } from "../helpers/auth.helper.js";
import { createTestApp, resetDb } from "../setup.js";

const app = createTestApp();

async function setupAdmin() {
  const cookies = await signUpAndLogin(app, "admin@test.com", "admin_password_123");
  const meRes = await app.request("/api/users/me", { headers: { Cookie: cookies } });
  const { data: profile } = await meRes.json();
  createAdminUser(db, profile.userId);
  return { cookies, profile };
}

async function setupUser() {
  const cookies = await signUpAndLogin(app, "user@test.com", "user_password_123");
  const meRes = await app.request("/api/users/me", { headers: { Cookie: cookies } });
  const { data: profile } = await meRes.json();
  return { cookies, profile };
}

beforeEach(() => {
  resetDb();
});

describe("Admin routes", () => {
  describe("GET /api/admin/users", () => {
    it("should return 401 without session", async () => {
      const res = await app.request("/api/admin/users");
      expect(res.status).toBe(401);
    });

    it("should return 403 with user role", async () => {
      const { cookies } = await setupUser();
      const res = await app.request("/api/admin/users", { headers: { Cookie: cookies } });
      expect(res.status).toBe(403);
    });

    it("should return 200 with paginated list as admin", async () => {
      const { cookies } = await setupAdmin();
      const res = await app.request("/api/admin/users", { headers: { Cookie: cookies } });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta).toHaveProperty("total");
      expect(body.meta).toHaveProperty("page");
    });

    it("should return at most 20 items per page by default", async () => {
      const { cookies } = await setupAdmin();
      const res = await app.request("/api/admin/users?page=1", { headers: { Cookie: cookies } });
      const body = await res.json();
      expect(body.data.length).toBeLessThanOrEqual(20);
      expect(body.meta.page).toBe(1);
    });
  });

  describe("PATCH /api/admin/users/:id/role", () => {
    it("should return 403 with user role", async () => {
      const { cookies } = await setupUser();
      const res = await app.request("/api/admin/users/some-id/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookies },
        body: JSON.stringify({ role: "admin" }),
      });
      expect(res.status).toBe(403);
    });

    it("should return 404 for non-existent profile ID", async () => {
      const { cookies } = await setupAdmin();
      const res = await app.request("/api/admin/users/nonexistent-profile-id/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookies },
        body: JSON.stringify({ role: "admin" }),
      });
      expect(res.status).toBe(404);
    });

    it("should return 204 and update role as admin", async () => {
      const { cookies } = await setupAdmin();
      const { profile: targetProfile } = await setupUser();

      const res = await app.request(`/api/admin/users/${targetProfile.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookies },
        body: JSON.stringify({ role: "admin" }),
      });
      expect(res.status).toBe(204);

      const updated = db
        .select({ role: userProfile.role })
        .from(userProfile)
        .where(eq(userProfile.id, targetProfile.id))
        .get();
      expect(updated?.role).toBe("admin");
    });

    it("should return 400 for invalid role value", async () => {
      const { cookies } = await setupAdmin();
      const { profile: targetProfile } = await setupUser();

      const res = await app.request(`/api/admin/users/${targetProfile.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookies },
        body: JSON.stringify({ role: "superadmin" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/admin/users/:id", () => {
    it("should return 403 with user role", async () => {
      const { cookies } = await setupUser();
      const res = await app.request("/api/admin/users/some-id", {
        method: "DELETE",
        headers: { Cookie: cookies },
      });
      expect(res.status).toBe(403);
    });

    it("should return 404 for non-existent profile ID", async () => {
      const { cookies } = await setupAdmin();
      const res = await app.request("/api/admin/users/nonexistent-profile-id", {
        method: "DELETE",
        headers: { Cookie: cookies },
      });
      expect(res.status).toBe(404);
    });

    it("should return 204 and delete user as admin", async () => {
      const { cookies } = await setupAdmin();
      const { profile: targetProfile } = await setupUser();

      const res = await app.request(`/api/admin/users/${targetProfile.id}`, {
        method: "DELETE",
        headers: { Cookie: cookies },
      });
      expect(res.status).toBe(204);

      const deleted = db
        .select({ id: userProfile.id })
        .from(userProfile)
        .where(eq(userProfile.id, targetProfile.id))
        .get();
      expect(deleted).toBeUndefined();
    });
  });
});
