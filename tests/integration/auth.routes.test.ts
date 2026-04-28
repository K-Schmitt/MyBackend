import { beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDb } from "../setup.js";

const app = createTestApp();

beforeEach(() => {
  resetDb();
});

describe("Auth routes", () => {
  describe("POST /api/auth/sign-up/email", () => {
    it("should return 200 with valid credentials", async () => {
      const res = await app.request("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "signup@test.com", password: "password_test_123", name: "Sign Up User" }),
      });
      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/auth/sign-in/email", () => {
    it("should return 200 and set cookie with correct credentials", async () => {
      await app.request("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "signin@test.com", password: "password_test_123", name: "Sign In User" }),
      });

      const res = await app.request("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "signin@test.com", password: "password_test_123" }),
      });
      expect(res.status).toBe(200);
      // Session cookie must be present
      expect(res.headers.getSetCookie().length).toBeGreaterThan(0);
    });

    it("should return 401 with wrong password", async () => {
      await app.request("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "wrongpass@test.com", password: "password_test_123", name: "Wrong Pass" }),
      });

      const res = await app.request("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "wrongpass@test.com", password: "definitly_wrong" }),
      });
      expect(res.status).toBe(401);
    });

    it("should return 429 after 5 failed login attempts from the same IP", async () => {
      // Unique IP so this test does not interfere with other tests in this file
      const RATE_LIMIT_IP = "10.0.0.42";
      const failHeaders = {
        "Content-Type": "application/json",
        "x-forwarded-for": RATE_LIMIT_IP,
      };
      const failBody = JSON.stringify({ email: "noexist@test.com", password: "wrongpass" });

      // Consume the 5-request allowance
      for (let i = 0; i < 5; i++) {
        await app.request("/api/auth/sign-in/email", { method: "POST", headers: failHeaders, body: failBody });
      }

      // 6th attempt exceeds maxRequests=5 → 429
      const res = await app.request("/api/auth/sign-in/email", {
        method: "POST",
        headers: failHeaders,
        body: failBody,
      });
      expect(res.status).toBe(429);
    });
  });
});
