const { pool } = require("../../config/database");

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
    throw new Error("No active employee is available for sales processing.");
  }

  return fallbackRows[0].employee_id;
}

async function resolveCustomerId(connection, customer) {
  if (!customer) {
    return null;
  }

  const existingId = Number(customer.customer_id || 0);

  if (existingId > 0) {
    const [rows] = await connection.query(
      `SELECT customer_id
       FROM customers
       WHERE customer_id = ?
       LIMIT 1`,
      [existingId]
    );

    if (rows[0]) {
      return rows[0].customer_id;
    }
  }

  const customerName = String(customer.customer_name || "").trim();

  if (!customerName || customerName.toLowerCase() === "walk-in customer") {
    return null;
  }

  const [insertResult] = await connection.query(
    `INSERT INTO customers (customer_name, phone, email, address)
     VALUES (?, ?, ?, ?)`,
    [
      customerName,
      String(customer.phone || "").trim() || null,
      String(customer.email || "").trim() || null,
      String(customer.address || "").trim() || null
    ]
  );

  return insertResult.insertId;
}

async function fetchSalesWorkspace() {
  const [products, customers, recentSales, reportRows] = await Promise.all([
    pool.query(
      `SELECT
         iv.product_id,
         iv.product_code,
         iv.product_name,
         iv.category_name,
         iv.material,
         iv.gemstone,
         iv.selling_price,
         iv.stock_quantity,
         iv.reorder_level,
         iv.stock_status
       FROM inventory_view iv
       ORDER BY iv.product_name ASC`
    ),
    pool.query(
      `SELECT customer_id, customer_name, phone, email, address
       FROM customers
       ORDER BY customer_name ASC`
    ),
    pool.query(
      `SELECT
         sr.sale_id,
         sr.invoice_number,
         sr.sale_date,
         sr.customer_name,
         sr.cashier,
         sr.total_amount,
         sr.payment_method,
         sr.payment_status,
         COALESCE(items.item_count, 0) AS item_count
       FROM sales_report sr
       LEFT JOIN (
         SELECT sale_id, SUM(quantity) AS item_count
         FROM sale_details
         GROUP BY sale_id
       ) items
         ON items.sale_id = sr.sale_id
       ORDER BY sr.sale_date DESC
       LIMIT 10`
    ),
    pool.query(
      `SELECT
         COUNT(*) AS sales_count,
         COALESCE(SUM(total_amount), 0) AS sales_total,
         COALESCE(SUM(discount), 0) AS total_discount
       FROM sales`
    )
  ]);

  return {
    ok: true,
    products: products[0],
    customers: customers[0],
    salesHistory: recentSales[0],
    report: reportRows[0][0]
  };
}

async function generateInvoiceNumber(connection) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const datePart = `${yyyy}${mm}${dd}`;

  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM sales
     WHERE invoice_number LIKE ?`,
    [`INV-${datePart}-%`]
  );

  const nextNumber = Number(rows[0]?.total || 0) + 1;
  return `INV-${datePart}-${String(nextNumber).padStart(4, "0")}`;
}

async function createSale(payload) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const items = Array.isArray(payload.items) ? payload.items : [];
    const paymentMethod = String(payload.payment_method || "Cash").trim() || "Cash";
    const amountPaid = Number(payload.amount_paid || 0);
    const employeeId = await resolveEmployeeId(connection, payload.employee_id);
    const customerId = await resolveCustomerId(connection, payload.customer);

    if (!items.length) {
      throw new Error("Add at least one product to the sale.");
    }

    const productIds = items.map((item) => Number(item.product_id || 0)).filter((value) => value > 0);

    if (!productIds.length) {
      throw new Error("The sale items are invalid.");
    }

    const [productRows] = await connection.query(
      `SELECT product_id, product_code, product_name, selling_price, stock_quantity, reorder_level
       FROM products
       WHERE product_id IN (?)`,
      [productIds]
    );

    const productsById = new Map(productRows.map((row) => [row.product_id, row]));

    let subtotal = 0;
    let totalDiscount = 0;
    const normalizedItems = items.map((item) => {
      const product = productsById.get(Number(item.product_id || 0));
      const quantity = Math.max(1, Number(item.quantity || 0));
      const discount = Math.max(0, Number(item.discount || 0));

      if (!product) {
        throw new Error("One of the selected products could not be found.");
      }

      if (quantity > Number(product.stock_quantity || 0)) {
        throw new Error(`Not enough stock for ${product.product_name}.`);
      }

      const unitPrice = Number(product.selling_price || 0);
      const lineSubtotal = unitPrice * quantity;
      const lineTotal = Math.max(0, lineSubtotal - discount);

      subtotal += lineSubtotal;
      totalDiscount += discount;

      return {
        product,
        quantity,
        discount,
        unitPrice,
        subtotal: lineTotal
      };
    });

    const totalAmount = Math.max(0, subtotal - totalDiscount);
    const paymentStatus =
      amountPaid >= totalAmount ? "Paid" : amountPaid > 0 ? "Partial" : "Unpaid";
    const invoiceNumber = await generateInvoiceNumber(connection);

    const [saleResult] = await connection.query(
      `INSERT INTO sales (
         invoice_number,
         customer_id,
         employee_id,
         subtotal,
         discount,
         total_amount,
         payment_method,
         payment_status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceNumber,
        customerId,
        employeeId,
        subtotal,
        totalDiscount,
        totalAmount,
        paymentMethod,
        paymentStatus
      ]
    );

    for (const item of normalizedItems) {
      await connection.query(
        `INSERT INTO sale_details (
           sale_id,
           product_id,
           quantity,
           unit_price,
           discount,
           subtotal
         ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          saleResult.insertId,
          item.product.product_id,
          item.quantity,
          item.unitPrice,
          item.discount,
          item.subtotal
        ]
      );

      const nextStock = Number(item.product.stock_quantity || 0) - item.quantity;
      const nextStatus =
        nextStock <= 0
          ? "Out of Stock"
          : nextStock <= Number(item.product.reorder_level || 0)
            ? "Low Stock"
            : "Available";

      await connection.query(
        `UPDATE products
         SET stock_quantity = ?, status = ?
         WHERE product_id = ?`,
        [nextStock, nextStatus, item.product.product_id]
      );

      await connection.query(
        `INSERT INTO inventory_transactions (
           product_id,
           employee_id,
           transaction_type,
           quantity,
           reference_number,
           remarks
         ) VALUES (?, ?, 'Stock Out', ?, ?, ?)`,
        [
          item.product.product_id,
          employeeId,
          item.quantity,
          invoiceNumber,
          `Sold via sales checkout (${invoiceNumber}).`
        ]
      );
    }

    if (amountPaid > 0) {
      await connection.query(
        `INSERT INTO payments (
           sale_id,
           amount,
           payment_method,
           reference_number
         ) VALUES (?, ?, ?, ?)`,
        [
          saleResult.insertId,
          amountPaid,
          paymentMethod,
          payload.reference_number ? String(payload.reference_number).trim() : null
        ]
      );
    }

    await connection.commit();

    return {
      ok: true,
      message: "Sale processed successfully.",
      invoice_number: invoiceNumber,
      workspace: await fetchSalesWorkspace()
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function voidSale(saleId, payload) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const numericSaleId = Number(saleId || 0);
    const requesterRole = String(payload.role || "").trim();

    if (!["Admin", "Manager"].includes(requesterRole)) {
      throw new Error("Only an authorized admin or manager can void a sale.");
    }

    const [saleRows] = await connection.query(
      `SELECT sale_id, invoice_number
       FROM sales
       WHERE sale_id = ?
       LIMIT 1`,
      [numericSaleId]
    );

    const sale = saleRows[0];

    if (!sale) {
      throw new Error("Sale not found.");
    }

    const [detailRows] = await connection.query(
      `SELECT sd.product_id, sd.quantity, p.stock_quantity, p.reorder_level
       FROM sale_details sd
       INNER JOIN products p
         ON p.product_id = sd.product_id
       WHERE sd.sale_id = ?`,
      [numericSaleId]
    );

    const employeeId = await resolveEmployeeId(connection, payload.employee_id);

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
         SET stock_quantity = ?, status = ?
         WHERE product_id = ?`,
        [nextStock, nextStatus, detail.product_id]
      );

      await connection.query(
        `INSERT INTO inventory_transactions (
           product_id,
           employee_id,
           transaction_type,
           quantity,
           reference_number,
           remarks
         ) VALUES (?, ?, 'Return', ?, ?, ?)`,
        [
          detail.product_id,
          employeeId,
          detail.quantity,
          sale.invoice_number,
          `Sale voided and stock returned (${sale.invoice_number}).`
        ]
      );
    }

    await connection.query(`DELETE FROM payments WHERE sale_id = ?`, [numericSaleId]);
    await connection.query(`DELETE FROM sale_details WHERE sale_id = ?`, [numericSaleId]);
    await connection.query(`DELETE FROM sales WHERE sale_id = ?`, [numericSaleId]);

    await connection.commit();

    return {
      ok: true,
      message: "Sale voided successfully.",
      workspace: await fetchSalesWorkspace()
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  createSale,
  fetchSalesWorkspace,
  voidSale
};
