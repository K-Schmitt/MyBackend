import { createTestApp, resetDb } from "../setup.js";
import { testClient } from "hono/testing";
import { beforeEach, describe, expect, it } from "vitest";

describe("Health routes", () => {
  const client = testClient(createTestApp());

  beforeEach(() => {
    resetDb();
  });

  describe("GET /api/health", () => {
    it("should return 200 with health shape", async () => {
      const res = await client.api.health.$get();

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({
        status: "ok",
        version: expect.any(String),
        uptime: expect.any(Number),
        timestamp: expect.any(String),
        database: { status: "ok", latencyMs: expect.any(Number) },
      });
    });

    it("should include X-Request-Id header", async () => {
      const res = await client.api.health.$get();

      expect(res.headers.get("x-request-id")).toBe("test-request-id");
    });
  });
});
