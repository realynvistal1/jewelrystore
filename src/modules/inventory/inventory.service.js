const { pool } = require("../../config/database");

function getProductStatus(stockQuantity, reorderLevel) {
  if (stockQuantity <= 0) {
    return "Out of Stock";
  }

  if (stockQuantity <= reorderLevel) {
    return "Low Stock";
  }

  return "Available";
}

async function resolveCategoryId(connection, categoryName) {
  const normalizedName = String(categoryName || "").trim();

  if (!normalizedName) {
    throw new Error("Category name is required.");
  }

  const [existingRows] = await connection.query(
    `SELECT category_id
     FROM categories
     WHERE LOWER(category_name) = LOWER(?)
     LIMIT 1`,
    [normalizedName]
  );

  if (existingRows[0]) {
    return existingRows[0].category_id;
  }

  const [insertResult] = await connection.query(
    `INSERT INTO categories (category_name, description)
     VALUES (?, ?)`,
    [normalizedName, `${normalizedName} category`]
  );

  return insertResult.insertId;
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
    throw new Error("No active employee is available for inventory logging.");
  }

  return fallbackRows[0].employee_id;
}

async function fetchInventoryRows(connection = pool) {
  const [rows] = await connection.query(
    `SELECT
       iv.product_id,
       iv.product_code,
       iv.product_name,
       iv.category_name,
       iv.material,
       iv.gemstone,
       iv.weight,
       iv.size,
       iv.purchase_price,
       iv.selling_price,
       iv.stock_quantity,
       iv.reorder_level,
       iv.stock_status,
       COALESCE(p.description, '') AS description,
       COALESCE(tx.sold_quantity, 0) AS sold_quantity,
       COALESCE(tx.damaged_quantity, 0) AS damaged_quantity
     FROM inventory_view iv
     INNER JOIN products p
       ON p.product_id = iv.product_id
     LEFT JOIN (
       SELECT
         product_id,
         SUM(CASE
           WHEN transaction_type = 'Stock Out' AND (remarks IS NULL OR remarks NOT LIKE '%damaged%')
             THEN quantity
           ELSE 0
         END) AS sold_quantity,
         SUM(CASE
           WHEN transaction_type = 'Adjustment' AND remarks LIKE '%damaged%'
             THEN quantity
           ELSE 0
         END) AS damaged_quantity
       FROM inventory_transactions
       GROUP BY product_id
     ) tx
       ON tx.product_id = iv.product_id
     ORDER BY iv.product_name ASC`
  );

  return rows;
}

async function getInventoryData() {
  const items = await fetchInventoryRows();

  return {
    ok: true,
    items
  };
}

async function createInventoryProduct(payload) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const productCode = String(payload.product_code || "").trim();
    const productName = String(payload.product_name || "").trim();
    const categoryName = String(payload.category_name || "").trim();
    const material = String(payload.material || "").trim() || null;
    const gemstone = String(payload.gemstone || "").trim() || null;
    const description = String(payload.description || payload.gemstone || "").trim() || null;
    const stockQuantity = Number(payload.stock_quantity || 0);
    const reorderLevel = Number(payload.reorder_level || 0);
    const sellingPrice = Number(payload.selling_price || 0);
    const purchasePrice = Number(payload.purchase_price || payload.selling_price || 0);
    const status = getProductStatus(stockQuantity, reorderLevel);
    const employeeId = await resolveEmployeeId(connection, payload.employee_id);
    const categoryId = await resolveCategoryId(connection, categoryName);

    if (!productCode || !productName) {
      throw new Error("Product code and product name are required.");
    }

    const [duplicateRows] = await connection.query(
      `SELECT product_id
       FROM products
       WHERE product_code = ?
       LIMIT 1`,
      [productCode]
    );

    if (duplicateRows[0]) {
      throw new Error("Product code already exists.");
    }

    const [insertResult] = await connection.query(
      `INSERT INTO products (
         product_code,
         product_name,
         category_id,
         material,
         gemstone,
         purchase_price,
         selling_price,
         stock_quantity,
         reorder_level,
         status,
         description
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productCode,
        productName,
        categoryId,
        material,
        gemstone,
        purchasePrice,
        sellingPrice,
        stockQuantity,
        reorderLevel,
        status,
        description
      ]
    );

    if (stockQuantity > 0) {
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
          insertResult.insertId,
          employeeId,
          stockQuantity,
          `OPEN-${productCode}`,
          "Initial stock recorded during product creation."
        ]
      );
    }

    await connection.commit();

    return {
      ok: true,
      message: "Product added successfully.",
      items: await fetchInventoryRows()
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateInventoryProduct(productCode, payload) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const normalizedCode = String(productCode || "").trim();
    const productName = String(payload.product_name || "").trim();
    const categoryName = String(payload.category_name || "").trim();
    const material = String(payload.material || "").trim() || null;
    const gemstone = String(payload.gemstone || "").trim() || null;
    const description = String(payload.description || payload.gemstone || "").trim() || null;
    const reorderLevel = Number(payload.reorder_level || 0);
    const sellingPrice = Number(payload.selling_price || 0);
    const purchasePrice = Number(payload.purchase_price || payload.selling_price || 0);
    const categoryId = await resolveCategoryId(connection, categoryName);

    const [rows] = await connection.query(
      `SELECT product_id, stock_quantity
       FROM products
       WHERE product_code = ?
       LIMIT 1`,
      [normalizedCode]
    );

    if (!rows[0]) {
      throw new Error("Product not found.");
    }

    const status = getProductStatus(Number(rows[0].stock_quantity || 0), reorderLevel);

    await connection.query(
      `UPDATE products
       SET product_name = ?,
           category_id = ?,
           material = ?,
           gemstone = ?,
           purchase_price = ?,
           selling_price = ?,
           reorder_level = ?,
           status = ?,
           description = ?
       WHERE product_id = ?`,
      [
        productName,
        categoryId,
        material,
        gemstone,
        purchasePrice,
        sellingPrice,
        reorderLevel,
        status,
        description,
        rows[0].product_id
      ]
    );

    await connection.commit();

    return {
      ok: true,
      message: "Product updated successfully.",
      items: await fetchInventoryRows()
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function applyInventoryAction(productCode, payload) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const normalizedCode = String(productCode || "").trim();
    const action = String(payload.action || "").trim();
    const quantity = Math.max(1, Number(payload.quantity || 0));
    const employeeId = await resolveEmployeeId(connection, payload.employee_id);

    const [rows] = await connection.query(
      `SELECT product_id, product_code, stock_quantity, reorder_level
       FROM products
       WHERE product_code = ?
       LIMIT 1`,
      [normalizedCode]
    );

    const product = rows[0];

    if (!product) {
      throw new Error("Product not found.");
    }

    let nextStock = Number(product.stock_quantity || 0);
    let transactionType = "Adjustment";
    let remarks = "";

    if (action === "add-stock") {
      nextStock += quantity;
      transactionType = "Stock In";
      remarks = "Stock added from inventory module.";
    } else if (action === "restock") {
      nextStock += quantity;
      transactionType = "Stock In";
      remarks = "Product restocked from inventory module.";
    } else if (action === "reduce-stock") {
      if (quantity > nextStock) {
        throw new Error("Cannot reduce more stock than is currently available.");
      }

      nextStock -= quantity;
      transactionType = "Stock Out";
      remarks = "Stock reduced from inventory module.";
    } else if (action === "record-damaged") {
      if (quantity > nextStock) {
        throw new Error("Cannot record more damaged items than available stock.");
      }

      nextStock -= quantity;
      transactionType = "Adjustment";
      remarks = "Damaged items recorded from inventory module.";
    } else {
      throw new Error("Unsupported inventory action.");
    }

    const status = getProductStatus(nextStock, Number(product.reorder_level || 0));

    await connection.query(
      `UPDATE products
       SET stock_quantity = ?,
           status = ?
       WHERE product_id = ?`,
      [nextStock, status, product.product_id]
    );

    await connection.query(
      `INSERT INTO inventory_transactions (
         product_id,
         employee_id,
         transaction_type,
         quantity,
         reference_number,
         remarks
       ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        product.product_id,
        employeeId,
        transactionType,
        quantity,
        `${transactionType === "Stock In" ? "IN" : "OUT"}-${product.product_code}`,
        remarks
      ]
    );

    await connection.commit();

    return {
      ok: true,
      message: "Inventory action applied successfully.",
      items: await fetchInventoryRows()
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  applyInventoryAction,
  createInventoryProduct,
  getInventoryData,
  updateInventoryProduct
};
