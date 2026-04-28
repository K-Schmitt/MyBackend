import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  // No FK — audit rows must survive user deletion
  userId: text("user_id"),
  action: text("action").notNull(),
  metadata: text("metadata").notNull().default("{}"),
  ip: text("ip").notNull(),
  createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
});
