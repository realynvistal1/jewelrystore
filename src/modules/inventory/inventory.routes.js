const express = require("express");
const {
  createProduct,
  listInventory,
  runInventoryAction,
  updateProduct
} = require("./inventory.controller");

const router = express.Router();

router.get("/inventory", listInventory);
router.post("/inventory", createProduct);
router.put("/inventory/:productCode", updateProduct);
router.post("/inventory/:productCode/actions", runInventoryAction);

module.exports = router;
