const express = require("express");
const { checkoutSale, getSalesWorkspace, voidSaleRecord } = require("./sales.controller");

const router = express.Router();

router.get("/sales/workspace", getSalesWorkspace);
router.post("/sales/checkout", checkoutSale);
router.post("/sales/:saleId/void", voidSaleRecord);

module.exports = router;
