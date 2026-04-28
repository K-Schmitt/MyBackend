import { resolve } from "node:path";
import { db } from "@/lib/db.js";
import { logger } from "@/lib/logger.js";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const migrationsFolder = resolve(process.cwd(), "src/db/migrations");

try {
  logger.info({ migrationsFolder }, "running migrations");
  migrate(db, { migrationsFolder });
  logger.info("migrations completed successfully");
  process.exit(0);
} catch (error) {
  logger.fatal({ error }, "migrations failed — aborting");
  process.exit(1);
}
