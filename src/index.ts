import { app } from "@/app.js";
import { env } from "@/lib/env.js";
import { logger } from "@/lib/logger.js";
import { serve } from "@hono/node-server";

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info({ port: info.port }, "server started");
});
