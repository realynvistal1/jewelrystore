const express = require("express");
const {
  addCustomer,
  editCustomer,
  getCustomersWorkspace,
  removeCustomer
} = require("./customers.controller");

const router = express.Router();

router.get("/customers/workspace", getCustomersWorkspace);
router.post("/customers", addCustomer);
router.put("/customers/:customerId", editCustomer);
router.delete("/customers/:customerId", removeCustomer);

module.exports = router;
