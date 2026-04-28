import Database from "better-sqlite3";
import path from "path";

const email = process.argv[2];
const dbPath = process.env.DATABASE_PATH || "./data/app.db";

if (!email) {
  console.error("Usage: node src/scripts/set-admin.js <email>");
  process.exit(1);
}

const db = new Database(dbPath);

try {
  const user = db.prepare("SELECT id FROM user WHERE email = ?").get(email);

  if (!user) {
    console.error(`User with email ${email} not found.`);
    process.exit(1);
  }

  console.log(`Found user ID: ${user.id}`);

  const result = db
    .prepare("UPDATE user_profile SET role = 'admin' WHERE userId = ?")
    .run(user.id);

  if (result.changes > 0) {
    console.log(`Successfully updated ${email} to admin role!`);
  } else {
    console.log(`User ${email} is probably already an admin, or user profile not found.`);
  }
} catch (err) {
  console.error("An error occurred:", err);
  process.exit(1);
} finally {
  db.close();
}
