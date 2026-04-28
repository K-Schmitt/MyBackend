import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { ulid } from "ulid";
import { db } from "@/db/index.js";
import { user } from "@/db/schema/auth.schema.js";
import { userProfile } from "@/db/schema/users.schema.js";
import { errorHandler } from "@/middleware/error.middleware.js";
import { requireRole } from "@/middleware/require-role.middleware.js";
import { Hono } from "hono";

const TEST_AUTH_ID = "rr-test-user-001";
const TEST_PROFILE_ID = ulid();

function seedUser(role: "user" | "admin" = "user") {
  db.insert(user)
    .values({
      id: TEST_AUTH_ID,
      name: "Role Test User",
      email: "roletest@example.com",
      emailVerified: false,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .run();
  db.insert(userProfile)
    .values({ id: TEST_PROFILE_ID, userId: TEST_AUTH_ID, role })
    .run();
}

function resetUser(role: "user" | "admin" = "user") {
  db.delete(userProfile).where(eq(userProfile.userId, TEST_AUTH_ID)).run();
  db.delete(user).where(eq(user.id, TEST_AUTH_ID)).run();
  seedUser(role);
}

function buildApp(role: "user" | "admin") {
  resetUser(role);
  const app = new Hono();
  app.use("*", async (c, next) => {
    // `as never` bypasses Hono's generic Variables constraint in test context
    c.set("user", { id: TEST_AUTH_ID } as never);
    c.set("session", {} as never);
    await next();
  });
  app.get("/protected", requireRole("admin"), (c) => c.json({ ok: true }));
  app.onError(errorHandler);
  return app;
}

beforeAll(() => {
  seedUser();
});

afterEach(() => {
  resetUser();
});

describe("requireRole middleware", () => {
  it("should allow access when user has the required role", async () => {
    const app = buildApp("admin");
    const res = await app.request("/protected");
    expect(res.status).toBe(200);
  });

  it("should return 403 when user lacks the required role", async () => {
    const app = buildApp("user");
    const res = await app.request("/protected");
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
