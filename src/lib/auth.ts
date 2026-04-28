import { db } from "@/db/index.js";
import { env } from "@/lib/env.js";
import * as auditService from "@/services/audit.service.js";
import { createUserProfile } from "@/services/user.service.js";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
  secret: env.SESSION_SECRET,
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          createUserProfile(createdUser.id);
        },
      },
    },
    session: {
      create: {
        after: async (createdSession) => {
          // IP unavailable in DB hooks — request context not accessible here
          auditService.log("auth.sign_in", createdSession.userId, {}, "unknown");
        },
      },
    },
  },
  session: {
    // Cookie cache improves perf in prod; disabled in tests so session deletion is immediate
    cookieCache: { enabled: env.NODE_ENV !== "test" },
  },
  advanced: {
    cookiePrefix: "p3",
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
    },
  },
});
