import { logger } from "@/lib/logger.js";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_PATH: z.string().default("./data/app.db"),
  SESSION_SECRET: z.string().min(32),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  FORCE_REQUEST_ID: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  BETTER_AUTH_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  logger.fatal({ errors: parsed.error.flatten().fieldErrors }, "Invalid environment variables");
  process.exit(1);
}

export const env = parsed.data;

if (env.NODE_ENV !== "test") {
  const providers = [
    env.GOOGLE_CLIENT_ID && "google",
    env.GITHUB_CLIENT_ID && "github",
    env.DISCORD_CLIENT_ID && "discord",
  ].filter(Boolean);
  logger.info({ providers }, "Enabled OAuth providers");
}
