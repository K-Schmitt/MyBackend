import { userProfile } from "@/db/schema/users.schema.js";
import { db as defaultDb } from "@/lib/db.js";
import { eq } from "drizzle-orm";

type DrizzleDb = typeof defaultDb;

interface AppLike {
  request(input: string | Request, options?: RequestInit): Promise<Response>;
}

function extractCookies(response: Response): string {
  // getSetCookie() avoids comma-collapse of multi-value Set-Cookie headers
  return response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ");
}

export async function signUpAndLogin(app: AppLike, email: string, password: string): Promise<string> {
  await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name: "Test User" }),
  });

  const res = await app.request("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return extractCookies(res);
}

export function createAdminUser(db: DrizzleDb, authUserId: string): void {
  db.update(userProfile).set({ role: "admin" }).where(eq(userProfile.userId, authUserId)).run();
}
