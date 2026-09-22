import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DB_HOST = (process.env.DB_HOST && process.env.DB_HOST.trim()) || "127.0.0.1";
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_USER = (process.env.DB_USER && process.env.DB_USER.trim()) || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = (process.env.DB_NAME && process.env.DB_NAME.trim()) || "localspot_db";

const MIGRATIONS_DIR = path.resolve(process.cwd(), "migrations");

async function runMigrations() {
  console.log(`Connecting to MySQL at ${DB_HOST}:${DB_PORT} as ${DB_USER}...`);

  // 1. Connect without selecting database to ensure localspot_db exists
  let rootConn;
  try {
    rootConn = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
    });
  } catch (err) {
    console.error(
      `❌ Could not connect to MySQL server at ${DB_HOST}:${DB_PORT}. Is XAMPP MySQL running?`
    );
    console.error(`Error details: ${err.message}`);
    process.exit(1);
  }

  console.log(`Ensuring database '${DB_NAME}' exists...`);
  await rootConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  );
  await rootConn.end();

  // 2. Connect to the target database with multipleStatements enabled
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true,
  });

  // 3. Ensure schema_migrations table exists
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`schema_migrations\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`migration_name\` VARCHAR(255) UNIQUE NOT NULL,
      \`executed_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Retrieve already executed migrations
  const [executedRows] = await conn.query(
    "SELECT migration_name FROM `schema_migrations`;"
  );
  const executedSet = new Set(executedRows.map((r) => r.migration_name));

  // 5. Read available migration files from migrations/ directory
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const pending = files.filter((f) => !executedSet.has(f));

  if (pending.length === 0) {
    console.log("✅ Database is already up to date. No pending migrations.");
    await conn.end();
    return;
  }

  console.log(`Found ${pending.length} pending migration(s):`);

  // 6. Execute pending migrations sequentially
  for (const file of pending) {
    console.log(`👉 Applying: ${file}...`);
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");

    try {
      await conn.query(sql);
      await conn.query(
        "INSERT INTO `schema_migrations` (migration_name) VALUES (?);",
        [file]
      );
      console.log(`✅ Applied: ${file}`);
    } catch (err) {
      console.error(`❌ Migration failed at ${file}:`, err.message);
      await conn.end();
      process.exit(1);
    }
  }

  console.log("🎉 All migrations completed successfully!");
  await conn.end();
}

runMigrations().catch((err) => {
  console.error("Fatal migration error:", err);
  process.exit(1);
});
