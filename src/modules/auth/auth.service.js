const { pool } = require("../../config/database");
const { loadEnv } = require("../../config/env");

loadEnv();

const DEFAULT_LOGIN_USERNAME = "admin";
const DEFAULT_LOGIN_PASSWORD = "password123";

async function authenticateUser(username, password) {
  const [employees] = await pool.query(
    `SELECT employee_id, full_name, username, password, role, status
     FROM employees
     WHERE username = ?
     LIMIT 1`,
    [username]
  );

  const employee = employees[0];

  if (employee && employee.status === "Active" && employee.password === password) {
    return {
      ok: true,
      message: `Welcome back, ${employee.full_name}.`,
      user: {
        id: employee.employee_id,
        name: employee.full_name,
        username: employee.username,
        role: employee.role
      }
    };
  }

  const validUsername = process.env.LOGIN_USERNAME || DEFAULT_LOGIN_USERNAME;
  const validPassword = process.env.LOGIN_PASSWORD || DEFAULT_LOGIN_PASSWORD;

  if (username === validUsername && password === validPassword) {
    return {
      ok: true,
      message: "Login successful.",
      user: {
        username: validUsername,
        role: "Admin"
      }
    };
  }

  return {
    ok: false,
    message: "Invalid username or password."
  };
}

module.exports = {
  authenticateUser
};
