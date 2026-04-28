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
  trustedOrigins: env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()),
  socialProviders: {
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
    ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? {
          github: {
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
          },
        }
      : {}),
    ...(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET
      ? {
          discord: {
            clientId: env.DISCORD_CLIENT_ID,
            clientSecret: env.DISCORD_CLIENT_SECRET,
          },
        }
      : {}),
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
    crossSubDomainCookies: {
      enabled: env.NODE_ENV === "production",
    },
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
    },
  },
});
