import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { resolve } from "node:path";
import { app } from "@/app.js";
import { auditLog } from "@/db/schema/audit-log.schema.js";
import { user } from "@/db/schema/auth.schema.js";
import { db } from "@/db/index.js";
import { clearRateLimitStores } from "@/middleware/rate-limit.middleware.js";

migrate(db, { migrationsFolder: resolve(process.cwd(), "src/db/migrations") });

export function createTestApp() {
  return app;
}

export function resetDb(): void {
  // Deleting users cascades to session, account, userProfile (ON DELETE CASCADE)
  db.delete(user).run();
  db.delete(auditLog).run();
  clearRateLimitStores();
}
