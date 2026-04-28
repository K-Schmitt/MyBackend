import { db } from "@/lib/db.js";
import { sql } from "drizzle-orm";

export type DbHealth = { status: "ok" | "error"; latencyMs: number };

export function checkDbHealth(): DbHealth {
  const start = Date.now();
  try {
    db.run(sql`SELECT 1`);
    return { status: "ok", latencyMs: Date.now() - start };
  } catch {
    return { status: "error", latencyMs: Date.now() - start };
  }
}
