const { pool } = require("../../config/database");

async function fetchCustomerWorkspace() {
  const [customerRows, metricRows, recentPurchaseRows] = await Promise.all([
    pool.query(
      `SELECT
         c.customer_id,
         c.customer_name,
         c.phone,
         c.email,
         c.address,
         c.created_at,
         COALESCE(SUM(s.total_amount), 0) AS total_purchases,
         COUNT(s.sale_id) AS purchase_count,
         MAX(s.sale_date) AS last_purchase
       FROM customers c
       LEFT JOIN sales s
         ON s.customer_id = c.customer_id
       GROUP BY c.customer_id, c.customer_name, c.phone, c.email, c.address, c.created_at
       ORDER BY c.customer_name ASC`
    ),
    pool.query(
      `SELECT
         COUNT(*) AS total_customers,
         SUM(CASE
           WHEN YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())
             THEN 1
           ELSE 0
         END) AS new_customers_month,
         SUM(CASE
           WHEN purchase_stats.purchase_count > 0 THEN 1
           ELSE 0
         END) AS active_buyers,
         SUM(CASE
           WHEN purchase_stats.purchase_count > 1 THEN 1
           ELSE 0
         END) AS repeat_customers
       FROM customers c
       LEFT JOIN (
         SELECT customer_id, COUNT(*) AS purchase_count
         FROM sales
         WHERE customer_id IS NOT NULL
         GROUP BY customer_id
       ) purchase_stats
         ON purchase_stats.customer_id = c.customer_id`
    ),
    pool.query(
      `SELECT
         s.customer_id,
         s.sale_id,
         s.invoice_number,
         s.sale_date,
         s.total_amount,
         s.payment_method,
         s.payment_status,
         COALESCE(items.item_count, 0) AS item_count
       FROM sales s
       LEFT JOIN (
         SELECT sale_id, SUM(quantity) AS item_count
         FROM sale_details
         GROUP BY sale_id
       ) items
         ON items.sale_id = s.sale_id
       WHERE s.customer_id IS NOT NULL
       ORDER BY s.sale_date DESC`
    )
  ]);

  return {
    ok: true,
    customers: customerRows[0],
    metrics: metricRows[0][0],
    purchaseHistory: recentPurchaseRows[0]
  };
}

async function createCustomer(payload) {
  const customerName = String(payload.customer_name || "").trim();
  const phone = String(payload.phone || "").trim() || null;
  const email = String(payload.email || "").trim() || null;
  const address = String(payload.address || "").trim() || null;

  if (!customerName) {
    throw new Error("Customer name is required.");
  }

  await pool.query(
    `INSERT INTO customers (customer_name, phone, email, address)
     VALUES (?, ?, ?, ?)`,
    [customerName, phone, email, address]
  );

  return {
    ok: true,
    message: "Customer added successfully.",
    workspace: await fetchCustomerWorkspace()
  };
}

async function updateCustomer(customerId, payload) {
  const numericCustomerId = Number(customerId || 0);
  const customerName = String(payload.customer_name || "").trim();
  const phone = String(payload.phone || "").trim() || null;
  const email = String(payload.email || "").trim() || null;
  const address = String(payload.address || "").trim() || null;

  if (!numericCustomerId) {
    throw new Error("Invalid customer record.");
  }

  if (!customerName) {
    throw new Error("Customer name is required.");
  }

  const [rows] = await pool.query(
    `SELECT customer_id
     FROM customers
     WHERE customer_id = ?
     LIMIT 1`,
    [numericCustomerId]
  );

  if (!rows[0]) {
    throw new Error("Customer not found.");
  }

  await pool.query(
    `UPDATE customers
     SET customer_name = ?,
         phone = ?,
         email = ?,
         address = ?
     WHERE customer_id = ?`,
    [customerName, phone, email, address, numericCustomerId]
  );

  return {
    ok: true,
    message: "Customer updated successfully.",
    workspace: await fetchCustomerWorkspace()
  };
}

async function deleteCustomer(customerId) {
  const numericCustomerId = Number(customerId || 0);

  if (!numericCustomerId) {
    throw new Error("Invalid customer record.");
  }

  const [saleRows] = await pool.query(
    `SELECT COUNT(*) AS total_sales
     FROM sales
     WHERE customer_id = ?`,
    [numericCustomerId]
  );

  if (Number(saleRows[0]?.total_sales || 0) > 0) {
    throw new Error("Customers with purchase history cannot be deleted.");
  }

  const [result] = await pool.query(
    `DELETE FROM customers
     WHERE customer_id = ?`,
    [numericCustomerId]
  );

  if (!result.affectedRows) {
    throw new Error("Customer not found.");
  }

  return {
    ok: true,
    message: "Customer deleted successfully.",
    workspace: await fetchCustomerWorkspace()
  };
}

module.exports = {
  createCustomer,
  deleteCustomer,
  fetchCustomerWorkspace,
  updateCustomer
};
