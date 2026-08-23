const express = require("express");
const path = require("path");
const webRoutes = require("./modules/web/web.routes");
const authRoutes = require("./modules/auth/auth.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");
const inventoryRoutes = require("./modules/inventory/inventory.routes");
const salesRoutes = require("./modules/sales/sales.routes");
const customersRoutes = require("./modules/customers/customers.routes");
const suppliersRoutes = require("./modules/suppliers/suppliers.routes");

const app = express();
const frontendPublicPath = path.join(__dirname, "frontend", "public");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(frontendPublicPath));

app.use("/", webRoutes);
app.use("/api", authRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", inventoryRoutes);
app.use("/api", salesRoutes);
app.use("/api", customersRoutes);
app.use("/api", suppliersRoutes);

module.exports = app;
