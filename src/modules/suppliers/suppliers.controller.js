const {
  createPurchaseOrder,
  createSupplier,
  deleteOrDeactivateSupplier,
  fetchSuppliersWorkspace,
  receiveDeliveredStock,
  updateSupplier
} = require("./suppliers.service");

async function getSuppliersWorkspace(req, res) {
  try {
    const result = await fetchSuppliersWorkspace();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Unable to load supplier workspace.",
      error: error.message
    });
  }
}

async function addSupplier(req, res) {
  try {
    const result = await createSupplier(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message || "Unable to add supplier."
    });
  }
}

async function editSupplier(req, res) {
  try {
    const result = await updateSupplier(req.params.supplierId, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message || "Unable to update supplier."
    });
  }
}

async function removeSupplier(req, res) {
  try {
    const result = await deleteOrDeactivateSupplier(req.params.supplierId);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message || "Unable to manage supplier record."
    });
  }
}

async function addPurchaseOrder(req, res) {
  try {
    const result = await createPurchaseOrder(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message || "Unable to create purchase order."
    });
  }
}

async function receiveStock(req, res) {
  try {
    const result = await receiveDeliveredStock(req.params.purchaseId, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message || "Unable to receive delivered stock."
    });
  }
}

module.exports = {
  addPurchaseOrder,
  addSupplier,
  editSupplier,
  getSuppliersWorkspace,
  receiveStock,
  removeSupplier
};
