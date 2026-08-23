const {
  createCustomer,
  deleteCustomer,
  fetchCustomerWorkspace,
  updateCustomer
} = require("./customers.service");

async function getCustomersWorkspace(req, res) {
  try {
    const result = await fetchCustomerWorkspace();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Unable to load customer workspace.",
      error: error.message
    });
  }
}

async function addCustomer(req, res) {
  try {
    const result = await createCustomer(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message || "Unable to add customer."
    });
  }
}

async function editCustomer(req, res) {
  try {
    const result = await updateCustomer(req.params.customerId, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message || "Unable to update customer."
    });
  }
}

async function removeCustomer(req, res) {
  try {
    const result = await deleteCustomer(req.params.customerId);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message || "Unable to delete customer."
    });
  }
}

module.exports = {
  addCustomer,
  editCustomer,
  getCustomersWorkspace,
  removeCustomer
};
