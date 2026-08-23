const { createSale, fetchSalesWorkspace, voidSale } = require("./sales.service");

async function getSalesWorkspace(req, res) {
  try {
    const result = await fetchSalesWorkspace();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Unable to load sales workspace.",
      error: error.message
    });
  }
}

async function checkoutSale(req, res) {
  try {
    const result = await createSale(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message || "Unable to process sale."
    });
  }
}

async function voidSaleRecord(req, res) {
  try {
    const result = await voidSale(req.params.saleId, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message || "Unable to void sale."
    });
  }
}

module.exports = {
  checkoutSale,
  getSalesWorkspace,
  voidSaleRecord
};
