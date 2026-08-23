const mysql = require("mysql2/promise");
const { loadEnv } = require("./env");

loadEnv();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "jewelrystore",
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function testDatabaseConnection() {
  const connection = await pool.getConnection();

  try {
    await connection.ping();
    return true;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  testDatabaseConnection
};
