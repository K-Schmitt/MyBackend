import { auditLog } from "@/db/schema/audit-log.schema.js";
import { db } from "@/lib/db.js";
import { logger } from "@/lib/logger.js";
import { ulid } from "ulid";

export function log(
  action: string,
  userId: string | null,
  metadata: Record<string, unknown>,
  ip: string,
  requestId?: string,
): void {
  try {
    db.insert(auditLog)
      .values({
        id: ulid(),
        userId,
        action,
        metadata: JSON.stringify(metadata),
        ip,
      })
      .run();
    logger.info({ action, userId, requestId }, "audit");
  } catch {
    // Audit failures must never crash the app
  }
}
