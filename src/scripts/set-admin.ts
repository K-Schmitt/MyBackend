import { user } from "@/db/schema/auth.schema.js";
import { userProfile } from "@/db/schema/users.schema.js";
import { db } from "@/lib/db.js";
import { eq } from "drizzle-orm";

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error("Usage: pnpm run set-admin <email>");
    process.exit(1);
  }

  console.log(`Looking for user with email: ${email}`);

  const foundUser = db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .get();

  if (!foundUser) {
    console.error(`User with email ${email} not found.`);
    process.exit(1);
  }

  console.log(`Found user ID: ${foundUser.id}`);

  const result = db
    .update(userProfile)
    .set({ role: "admin" })
    .where(eq(userProfile.userId, foundUser.id))
    .run();

  if (result.changes > 0) {
    console.log(`Successfully updated ${email} to admin role!`);
  } else {
    console.log(`User ${email} is probably already an admin, or user profile not found.`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("An error occurred:", err);
  process.exit(1);
});
