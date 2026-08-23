const { pool, testDatabaseConnection } = require("../../config/database");

async function getHealthStatus() {
  await testDatabaseConnection();

  return {
    ok: true,
    message: "Database connected successfully."
  };
}

async function getDashboardData() {
  const [
    inventorySummaryRows,
    customerCountRows,
    supplierCountRows,
    lowStockCountRows,
    salesCountRows,
    paymentCountRows,
    inventoryValueRows,
    customerRows,
    supplierRows,
    inventoryRows,
    salesReportRows,
    stockStatusAnalyticsRows,
    topValueProductRows
  ] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS totalInventoryItems, COALESCE(SUM(stock_quantity), 0) AS totalUnits
       FROM inventory_view`
    ),
    pool.query("SELECT COUNT(*) AS totalCustomers FROM customers"),
    pool.query("SELECT COUNT(*) AS totalSuppliers FROM suppliers"),
    pool.query("SELECT COUNT(*) AS lowStockItems FROM low_stock_products"),
    pool.query("SELECT COUNT(*) AS totalSales FROM sales"),
    pool.query("SELECT COUNT(*) AS totalPayments FROM payments"),
    pool.query(
      `SELECT
        COALESCE(SUM(stock_quantity * purchase_price), 0) AS inventoryCostValue,
        COALESCE(SUM(stock_quantity * selling_price), 0) AS inventoryRetailValue
       FROM products`
    ),
    pool.query(
      `SELECT customer_id, customer_name, phone, email, address, created_at
       FROM customers
       ORDER BY created_at DESC, customer_name ASC
       LIMIT 6`
    ),
    pool.query(
      `SELECT supplier_id, supplier_name, contact_person, phone, email, address
       FROM suppliers
       ORDER BY supplier_name ASC`
    ),
    pool.query(
      `SELECT product_code, product_name, category_name, stock_quantity, reorder_level,
              stock_status, selling_price, material, gemstone
       FROM inventory_view
       ORDER BY stock_quantity ASC, product_name ASC
       LIMIT 12`
    ),
    pool.query(
      `SELECT sale_id, invoice_number, sale_date, customer_name, cashier, total_amount,
              payment_method, payment_status
       FROM sales_report
       ORDER BY sale_date DESC
       LIMIT 6`
    ),
    pool.query(
      `SELECT stock_status, COUNT(*) AS total_items
       FROM inventory_view
       GROUP BY stock_status
       ORDER BY total_items DESC, stock_status ASC`
    ),
    pool.query(
      `SELECT product_code, product_name, category_name, stock_quantity, selling_price,
              (stock_quantity * selling_price) AS inventory_value
       FROM inventory_view
       ORDER BY inventory_value DESC, product_name ASC
       LIMIT 5`
    )
  ]);

  const inventorySummary = inventorySummaryRows[0][0];
  const inventoryValue = inventoryValueRows[0][0];

  return {
    ok: true,
    summary: {
      inventoryItems: inventorySummary.totalInventoryItems,
      unitsInStock: inventorySummary.totalUnits,
      customers: customerCountRows[0][0].totalCustomers,
      suppliers: supplierCountRows[0][0].totalSuppliers,
      lowStockItems: lowStockCountRows[0][0].lowStockItems,
      sales: salesCountRows[0][0].totalSales,
      payments: paymentCountRows[0][0].totalPayments,
      inventoryCostValue: inventoryValue.inventoryCostValue,
      inventoryRetailValue: inventoryValue.inventoryRetailValue
    },
    modules: {
      customers: customerRows[0],
      suppliers: supplierRows[0],
      inventory: inventoryRows[0],
      salesReport: salesReportRows[0]
    },
    analytics: {
      stockStatusDistribution: stockStatusAnalyticsRows[0],
      topInventoryValueProducts: topValueProductRows[0]
    }
  };
}

module.exports = {
  getDashboardData,
  getHealthStatus
};
