const { pool } = require("../../config/database");

async function ensureSupplierSchema(connection = pool) {
  const [columns] = await connection.query("SHOW COLUMNS FROM suppliers");
  const columnNames = new Set(columns.map((column) => column.Field));

  if (!columnNames.has("status")) {
    await connection.query(
      "ALTER TABLE suppliers ADD COLUMN status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active'"
    );
  }

  if (!columnNames.has("tin")) {
    await connection.query("ALTER TABLE suppliers ADD COLUMN tin VARCHAR(50) NULL");
  }

  if (!columnNames.has("payment_terms")) {
    await connection.query("ALTER TABLE suppliers ADD COLUMN payment_terms VARCHAR(100) NULL");
  }
}

async function resolveEmployeeId(connection, employeeId) {
  const numericEmployeeId = Number(employeeId || 0);

  if (numericEmployeeId > 0) {
    const [rows] = await connection.query(
      `SELECT employee_id
       FROM employees
       WHERE employee_id = ?
       LIMIT 1`,
      [numericEmployeeId]
    );

    if (rows[0]) {
      return rows[0].employee_id;
    }
  }

  const [fallbackRows] = await connection.query(
    `SELECT employee_id
     FROM employees
     WHERE status = 'Active'
     ORDER BY employee_id ASC
     LIMIT 1`
  );

  if (!fallbackRows[0]) {
    throw new Error("No active employee is available for supplier transactions.");
  }

  return fallbackRows[0].employee_id;
}

async function fetchSuppliersWorkspace() {
  await ensureSupplierSchema();

  const [supplierRows, metricsRows, productRows, purchaseRows] = await Promise.all([
    pool.query(
      `SELECT
         s.supplier_id,
         s.supplier_name,
         s.contact_person,
         s.phone,
         s.email,
         s.address,
         s.status,
         s.tin,
         s.payment_terms,
         s.created_at,
         COUNT(p.purchase_id) AS purchase_count,
         COALESCE(SUM(p.total_amount), 0) AS total_purchase_amount
       FROM suppliers s
       LEFT JOIN purchases p
         ON p.supplier_id = s.supplier_id
       GROUP BY
         s.supplier_id, s.supplier_name, s.contact_person, s.phone, s.email,
         s.address, s.status, s.tin, s.payment_terms, s.created_at
       ORDER BY s.supplier_name ASC`
    ),
    pool.query(
      `SELECT
         COUNT(*) AS total_suppliers,
         SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS active_suppliers,
         COALESCE((SELECT COUNT(*) FROM purchases), 0) AS total_purchases,
         COALESCE((SELECT SUM(total_amount) FROM purchases WHERE payment_status = 'Paid'), 0) AS total_paid,
         COALESCE((SELECT SUM(total_amount) FROM purchases WHERE payment_status <> 'Paid'), 0) AS outstanding
       FROM suppliers`
    ),
    pool.query(
      `SELECT product_id, product_code, product_name, purchase_price, selling_price, stock_quantity
       FROM products
       ORDER BY product_name ASC`
    ),
    pool.query(
      `SELECT
         p.purchase_id,
         p.purchase_number,
         p.supplier_id,
         p.purchase_date,
         p.total_amount,
         p.payment_status,
         s.supplier_name,
         COALESCE(details.total_items, 0) AS total_items,
         COALESCE(received.received_count, 0) AS received_count
       FROM purchases p
       INNER JOIN suppliers s
         ON s.supplier_id = p.supplier_id
       LEFT JOIN (
         SELECT purchase_id, SUM(quantity) AS total_items
         FROM purchase_details
         GROUP BY purchase_id
       ) details
         ON details.purchase_id = p.purchase_id
       LEFT JOIN (
         SELECT reference_number, COUNT(*) AS received_count
         FROM inventory_transactions
         WHERE transaction_type = 'Stock In' AND remarks LIKE 'Purchase delivery%'
         GROUP BY reference_number
       ) received
         ON received.reference_number = p.purchase_number
       ORDER BY p.purchase_date DESC`
    )
  ]);

  return {
    ok: true,
    suppliers: supplierRows[0],
    metrics: metricsRows[0][0],
    products: productRows[0],
    transactions: purchaseRows[0]
  };
}

async function createSupplier(payload) {
  await ensureSupplierSchema();

  const supplierName = String(payload.supplier_name || "").trim();
  const contactPerson = String(payload.contact_person || "").trim() || null;
  const phone = String(payload.phone || "").trim() || null;
  const email = String(payload.email || "").trim() || null;
  const address = String(payload.address || "").trim() || null;
  const tin = String(payload.tin || "").trim() || null;
  const paymentTerms = String(payload.payment_terms || "").trim() || null;

  if (!supplierName) {
    throw new Error("Supplier name is required.");
  }

  await pool.query(
    `INSERT INTO suppliers (
       supplier_name,
       contact_person,
       phone,
       email,
       address,
       status,
       tin,
       payment_terms
     ) VALUES (?, ?, ?, ?, ?, 'Active', ?, ?)`,
    [supplierName, contactPerson, phone, email, address, tin, paymentTerms]
  );

  return {
    ok: true,
    message: "Supplier added successfully.",
    workspace: await fetchSuppliersWorkspace()
  };
}

async function updateSupplier(supplierId, payload) {
  await ensureSupplierSchema();

  const numericSupplierId = Number(supplierId || 0);
  if (!numericSupplierId) {
    throw new Error("Invalid supplier record.");
  }

  const supplierName = String(payload.supplier_name || "").trim();
  if (!supplierName) {
    throw new Error("Supplier name is required.");
  }

  await pool.query(
    `UPDATE suppliers
     SET supplier_name = ?,
         contact_person = ?,
         phone = ?,
         email = ?,
         address = ?,
         status = ?,
         tin = ?,
         payment_terms = ?
     WHERE supplier_id = ?`,
    [
      supplierName,
      String(payload.contact_person || "").trim() || null,
      String(payload.phone || "").trim() || null,
      String(payload.email || "").trim() || null,
      String(payload.address || "").trim() || null,
      String(payload.status || "Active").trim() || "Active",
      String(payload.tin || "").trim() || null,
      String(payload.payment_terms || "").trim() || null,
      numericSupplierId
    ]
  );

  return {
    ok: true,
    message: "Supplier updated successfully.",
    workspace: await fetchSuppliersWorkspace()
  };
}

async function deleteOrDeactivateSupplier(supplierId) {
  await ensureSupplierSchema();

  const numericSupplierId = Number(supplierId || 0);
  if (!numericSupplierId) {
    throw new Error("Invalid supplier record.");
  }

  const [purchaseRows] = await pool.query(
    `SELECT COUNT(*) AS total_purchases
     FROM purchases
     WHERE supplier_id = ?`,
    [numericSupplierId]
  );

  if (Number(purchaseRows[0]?.total_purchases || 0) > 0) {
    await pool.query(
      `UPDATE suppliers
       SET status = 'Inactive'
       WHERE supplier_id = ?`,
      [numericSupplierId]
    );

    return {
      ok: true,
      message: "Supplier deactivated because transaction history exists.",
      workspace: await fetchSuppliersWorkspace()
    };
  }

  await pool.query(`DELETE FROM suppliers WHERE supplier_id = ?`, [numericSupplierId]);

  return {
    ok: true,
    message: "Supplier deleted successfully.",
    workspace: await fetchSuppliersWorkspace()
  };
}

async function generatePurchaseNumber(connection) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const datePart = `${yyyy}${mm}${dd}`;

  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM purchases
     WHERE purchase_number LIKE ?`,
    [`PO-${datePart}-%`]
  );

  const nextNumber = Number(rows[0]?.total || 0) + 1;
  return `PO-${datePart}-${String(nextNumber).padStart(4, "0")}`;
}

async function createPurchaseOrder(payload) {
  await ensureSupplierSchema();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const supplierId = Number(payload.supplier_id || 0);
    const items = Array.isArray(payload.items) ? payload.items : [];
    const employeeId = await resolveEmployeeId(connection, payload.employee_id);
    const paymentStatus = String(payload.payment_status || "Unpaid").trim() || "Unpaid";

    if (!supplierId) {
      throw new Error("Select a supplier first.");
    }

    if (!items.length) {
      throw new Error("Add at least one supplied product to the purchase order.");
    }

    const [supplierRows] = await connection.query(
      `SELECT supplier_id
       FROM suppliers
       WHERE supplier_id = ?
       LIMIT 1`,
      [supplierId]
    );

    if (!supplierRows[0]) {
      throw new Error("Supplier not found.");
    }

    const productIds = items.map((item) => Number(item.product_id || 0)).filter(Boolean);
    const [productRows] = await connection.query(
      `SELECT product_id, purchase_price
       FROM products
       WHERE product_id IN (?)`,
      [productIds]
    );
    const productsById = new Map(productRows.map((row) => [row.product_id, row]));

    let totalAmount = 0;
    const normalizedItems = items.map((item) => {
      const product = productsById.get(Number(item.product_id || 0));
      if (!product) {
        throw new Error("One of the selected products could not be found.");
      }

      const quantity = Math.max(1, Number(item.quantity || 0));
      const unitCost = Math.max(0, Number(item.unit_cost || product.purchase_price || 0));
      const subtotal = quantity * unitCost;
      totalAmount += subtotal;

      return {
        product_id: product.product_id,
        quantity,
        unit_cost: unitCost,
        subtotal
      };
    });

    const purchaseNumber = await generatePurchaseNumber(connection);
    const [purchaseResult] = await connection.query(
      `INSERT INTO purchases (
         purchase_number,
         supplier_id,
         employee_id,
         total_amount,
         payment_status
       ) VALUES (?, ?, ?, ?, ?)`,
      [purchaseNumber, supplierId, employeeId, totalAmount, paymentStatus]
    );

    for (const item of normalizedItems) {
      await connection.query(
        `INSERT INTO purchase_details (
           purchase_id,
           product_id,
           quantity,
           unit_cost,
           subtotal
         ) VALUES (?, ?, ?, ?, ?)`,
        [purchaseResult.insertId, item.product_id, item.quantity, item.unit_cost, item.subtotal]
      );
    }

    await connection.commit();

    return {
      ok: true,
      message: "Purchase/stock order created successfully.",
      purchase_number: purchaseNumber,
      workspace: await fetchSuppliersWorkspace()
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function receiveDeliveredStock(purchaseId, payload) {
  await ensureSupplierSchema();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const numericPurchaseId = Number(purchaseId || 0);
    const employeeId = await resolveEmployeeId(connection, payload.employee_id);

    const [purchaseRows] = await connection.query(
      `SELECT purchase_id, purchase_number
       FROM purchases
       WHERE purchase_id = ?
       LIMIT 1`,
      [numericPurchaseId]
    );
    const purchase = purchaseRows[0];

    if (!purchase) {
      throw new Error("Purchase order not found.");
    }

    const [receivedRows] = await connection.query(
      `SELECT COUNT(*) AS total_received
       FROM inventory_transactions
       WHERE reference_number = ?
         AND transaction_type = 'Stock In'
         AND remarks LIKE 'Purchase delivery%'`,
      [purchase.purchase_number]
    );

    if (Number(receivedRows[0]?.total_received || 0) > 0) {
      throw new Error("Delivered stock for this purchase order was already received.");
    }

    const [detailRows] = await connection.query(
      `SELECT pd.product_id, pd.quantity, pd.unit_cost, p.stock_quantity, p.reorder_level
       FROM purchase_details pd
       INNER JOIN products p
         ON p.product_id = pd.product_id
       WHERE pd.purchase_id = ?`,
      [numericPurchaseId]
    );

    for (const detail of detailRows) {
      const nextStock = Number(detail.stock_quantity || 0) + Number(detail.quantity || 0);
      const nextStatus =
        nextStock <= 0
          ? "Out of Stock"
          : nextStock <= Number(detail.reorder_level || 0)
            ? "Low Stock"
            : "Available";

      await connection.query(
        `UPDATE products
         SET stock_quantity = ?,
             purchase_price = ?,
             status = ?
         WHERE product_id = ?`,
        [nextStock, detail.unit_cost, nextStatus, detail.product_id]
      );

      await connection.query(
        `INSERT INTO inventory_transactions (
           product_id,
           employee_id,
           transaction_type,
           quantity,
           reference_number,
           remarks
         ) VALUES (?, ?, 'Stock In', ?, ?, ?)`,
        [
          detail.product_id,
          employeeId,
          detail.quantity,
          purchase.purchase_number,
          "Purchase delivery received and inventory updated."
        ]
      );
    }

    await connection.commit();

    return {
      ok: true,
      message: "Delivered stock received successfully and inventory updated.",
      workspace: await fetchSuppliersWorkspace()
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  createPurchaseOrder,
  createSupplier,
  deleteOrDeactivateSupplier,
  fetchSuppliersWorkspace,
  receiveDeliveredStock,
  updateSupplier
};
