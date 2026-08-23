const {
  applyInventoryAction,
  createInventoryProduct,
  getInventoryData,
  updateInventoryProduct
} = require("./inventory.service");

async function listInventory(req, res) {
  try {
    const result = await getInventoryData();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Unable to load inventory data.",
      error: error.message
    });
  }
}

async function createProduct(req, res) {
  try {
    const result = await createInventoryProduct(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message || "Unable to create product."
    });
  }
}

async function updateProduct(req, res) {
  try {
    const result = await updateInventoryProduct(req.params.productCode, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message || "Unable to update product."
    });
  }
}

async function runInventoryAction(req, res) {
  try {
    const result = await applyInventoryAction(req.params.productCode, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message || "Unable to apply inventory action."
    });
  }
}

module.exports = {
  createProduct,
  listInventory,
  runInventoryAction,
  updateProduct
};
