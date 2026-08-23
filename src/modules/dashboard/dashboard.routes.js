const express = require("express");
const { dashboard, health } = require("./dashboard.controller");

const router = express.Router();

router.get("/health/db", health);
router.get("/dashboard", dashboard);

module.exports = router;
