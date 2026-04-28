import { auth } from "@/lib/auth.js";
import { env } from "@/lib/env.js";
import { APP_VERSION } from "@/lib/logger.js";
import { errorHandler } from "@/middleware/error.middleware.js";
import { loggerMiddleware } from "@/middleware/logger.middleware.js";
import { authRateLimiter, loginRateLimiter } from "@/middleware/rate-limit.middleware.js";
import { requestIdMiddleware } from "@/middleware/request-id.middleware.js";
import { adminRoutes } from "@/routes/admin.routes.js";
import { userRoutes } from "@/routes/user.routes.js";
import { checkDbHealth } from "@/services/health.service.js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

const app = new Hono();

app.use("*", requestIdMiddleware);
app.use("*", loggerMiddleware);
app.use("*", secureHeaders());

app.use(
  "*",
  cors({
    origin: env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()),
    credentials: true,
  }),
);

app.use("/api/auth/*", authRateLimiter);
app.use("/api/auth/sign-in/email", loginRateLimiter);

app.all("/api/auth/*", (c) => auth.handler(c.req.raw));

app.route("/api/users", userRoutes);
app.route("/api/admin", adminRoutes);

app.get("/api/health", (c) => {
  const db = checkDbHealth();
  return c.json({
    status: db.status === "ok" ? "ok" : "degraded",
    version: APP_VERSION,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: db,
  });
});

app.onError(errorHandler);

export { app };
