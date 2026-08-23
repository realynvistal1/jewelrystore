const express = require("express");
const {
  addPurchaseOrder,
  addSupplier,
  editSupplier,
  getSuppliersWorkspace,
  receiveStock,
  removeSupplier
} = require("./suppliers.controller");

const router = express.Router();

router.get("/suppliers/workspace", getSuppliersWorkspace);
router.post("/suppliers", addSupplier);
router.put("/suppliers/:supplierId", editSupplier);
router.delete("/suppliers/:supplierId", removeSupplier);
router.post("/suppliers/purchases", addPurchaseOrder);
router.post("/suppliers/purchases/:purchaseId/receive", receiveStock);

module.exports = router;
