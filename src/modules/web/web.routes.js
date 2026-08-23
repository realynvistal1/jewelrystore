const express = require("express");
const path = require("path");

const router = express.Router();
const frontendViewsPath = path.join(__dirname, "..", "..", "frontend", "views");

router.get("/", (req, res) => {
  res.redirect("/login");
});

router.get("/login", (req, res) => {
  res.sendFile(path.join(frontendViewsPath, "login.html"));
});

router.get("/dashboard", (req, res) => {
  res.sendFile(path.join(frontendViewsPath, "dashboard.html"));
});

router.get("/customers", (req, res) => {
  res.sendFile(path.join(frontendViewsPath, "customers.html"));
});

router.get("/suppliers", (req, res) => {
  res.sendFile(path.join(frontendViewsPath, "suppliers.html"));
});

router.get("/inventory", (req, res) => {
  res.sendFile(path.join(frontendViewsPath, "inventory.html"));
});

router.get("/sales", (req, res) => {
  res.sendFile(path.join(frontendViewsPath, "sales.html"));
});

module.exports = router;
