import { beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDb } from "../setup.js";
import { signUpAndLogin } from "../helpers/auth.helper.js";

const app = createTestApp();
const EMAIL = "user@test.com";
const PASSWORD = "password_test_123";

beforeEach(() => {
  resetDb();
});

describe("User routes", () => {
  describe("GET /api/users/me", () => {
    it("should return 401 without session", async () => {
      const res = await app.request("/api/users/me");
      expect(res.status).toBe(401);
    });

    it("should return 200 with profile when authenticated", async () => {
      const cookies = await signUpAndLogin(app, EMAIL, PASSWORD);
      const res = await app.request("/api/users/me", {
        headers: { Cookie: cookies },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.email).toBe(EMAIL);
      expect(body.data.role).toBe("user");
    });
  });

  describe("PATCH /api/users/me", () => {
    it("should return 401 without session", async () => {
      const res = await app.request("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Name" }),
      });
      expect(res.status).toBe(401);
    });

    it("should return 400 for invalid body (name too short, avatarUrl not a URL)", async () => {
      const cookies = await signUpAndLogin(app, EMAIL, PASSWORD);
      const res = await app.request("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookies },
        body: JSON.stringify({ name: "X", avatarUrl: "not-a-url" }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 200 and update profile with valid data", async () => {
      const cookies = await signUpAndLogin(app, EMAIL, PASSWORD);
      const res = await app.request("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookies },
        body: JSON.stringify({ name: "Updated Name", bio: "My integration bio" }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.name).toBe("Updated Name");
      expect(body.data.bio).toBe("My integration bio");
    });
  });

  describe("DELETE /api/users/me", () => {
    it("should return 401 without session", async () => {
      const res = await app.request("/api/users/me", { method: "DELETE" });
      expect(res.status).toBe(401);
    });

    it("should return 204 and delete account", async () => {
      const cookies = await signUpAndLogin(app, EMAIL, PASSWORD);
      const res = await app.request("/api/users/me", {
        method: "DELETE",
        headers: { Cookie: cookies },
      });
      expect(res.status).toBe(204);
    });

    it("should invalidate session after deletion", async () => {
      const cookies = await signUpAndLogin(app, EMAIL, PASSWORD);
      await app.request("/api/users/me", {
        method: "DELETE",
        headers: { Cookie: cookies },
      });
      const res = await app.request("/api/users/me", {
        headers: { Cookie: cookies },
      });
      expect(res.status).toBe(401);
    });
  });
});
