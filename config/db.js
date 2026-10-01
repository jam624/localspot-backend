import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: (process.env.DB_HOST && process.env.DB_HOST.trim()) || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: (process.env.DB_USER && process.env.DB_USER.trim()) || "root",
  password: process.env.DB_PASSWORD || "",
  database:
    (process.env.DB_NAME && process.env.DB_NAME.trim()) || "localspot_db",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
});

export async function query(statement, params = []) {
  const [rows] = await pool.execute(statement, params);
  return rows;
}

export async function checkDatabaseConnection() {
  const [rows] = await pool.query("SELECT 1 AS ok");
  return rows[0];
}

export default pool;
