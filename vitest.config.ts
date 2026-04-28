import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vitest/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    env: {
      NODE_ENV: "test",
      DATABASE_PATH: ":memory:",
      SESSION_SECRET: "test-secret-that-is-at-least-32-characters-long",
      ALLOWED_ORIGINS: "http://localhost:3000",
      // Better Auth needs BETTER_AUTH_URL to route requests — Hono test client uses http://localhost
      BETTER_AUTH_URL: "http://localhost",
      // Fixed request ID so integration tests can assert on the X-Request-Id header
      FORCE_REQUEST_ID: "test-request-id",
    },
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/services/**", "src/routes/**", "src/middleware/**"],
      thresholds: { lines: 80, functions: 80 },
    },
  },
});
