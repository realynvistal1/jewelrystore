import { escapeHtml, formatCurrency, formatNumber } from "./formatters.js";
import {
  createCustomer as createCustomerRecord,
  deleteCustomer as deleteCustomerRecord,
  fetchCustomersWorkspace as fetchCustomersWorkspaceApi,
  updateCustomer as updateCustomerRecord
} from "./customers-api.js";
import {
  createSupplier as createSupplierRecord,
  createSupplierPurchase,
  deleteSupplier as deleteSupplierRecord,
  fetchSuppliersWorkspace as fetchSuppliersWorkspaceApi,
  receiveSupplierPurchase,
  updateSupplier as updateSupplierRecord
} from "./suppliers-api.js";
import {
  applyInventoryAction,
  createInventoryProduct,
  fetchInventoryData,
  updateInventoryProduct
} from "./inventory-api.js";
import { checkoutSale, fetchSalesWorkspace as fetchSalesWorkspaceApi, voidSale } from "./sales-api.js";
import { getUser } from "./session.js";

function renderList(items, renderer, emptyText) {
  if (!items || items.length === 0) {
    return `<p class="empty-copy">${escapeHtml(emptyText)}</p>`;
  }

  return `<div class="table-like">${items.map(renderer).join("")}</div>`;
}

export function renderCustomersModule(workspace) {
  const serializedWorkspace = JSON.stringify(workspace || {}).replaceAll("</script", "<\\/script");

  return `
    <section class="customers-screen">
      <header class="customers-hero">
        <div>
          <p class="eyebrow">Customer</p>
          <h2 class="customers-page-heading">Customers</h2>
        </div>
        <div class="customers-toolbar">
          <input id="customersSearchInput" type="search" placeholder="Search customers by name, ID, phone, email" />
          <button id="customersSearchButton" class="customers-primary-button" type="button">Search</button>
        </div>
      </header>

      <div id="customersAlert" class="customers-alert" hidden></div>

      <section id="customersMetrics" class="customers-metrics-grid"></section>

      <section class="customers-main-grid">
        <article class="customers-card customers-records-card">
          <div class="customers-card-header">
            <h3>Customer Records</h3>
          </div>
          <div id="customersTable" class="customers-table-wrap"></div>
        </article>

        <article class="customers-card customers-details-card">
          <div class="customers-card-header">
            <h3>Customer Information</h3>
          </div>
          <div id="customersDetailsPanel" class="customers-details-panel"></div>
        </article>
      </section>

      <section class="customers-bottom-grid">
        <article class="customers-card">
          <div class="customers-card-header">
            <h3>Add New Customer</h3>
          </div>
          <form id="customersAddForm" class="customers-form">
            <label>
              <span>Full Name</span>
              <input name="customer_name" type="text" placeholder="Enter full name" required />
            </label>
            <label>
              <span>Contact Number</span>
              <input name="phone" type="text" placeholder="e.g. 0917 123 4567" />
            </label>
            <label>
              <span>Email</span>
              <input name="email" type="email" placeholder="Enter email address" />
            </label>
            <label class="field-span-2">
              <span>Address</span>
              <input name="address" type="text" placeholder="Enter complete address" />
            </label>
            <button class="customers-primary-button field-span-2" type="submit">Add Customer</button>
          </form>
        </article>

        <article class="customers-card">
          <div class="customers-card-header">
            <h3>Purchase History</h3>
          </div>
          <div id="customersPurchaseHistory" class="customers-history-wrap"></div>
        </article>
      </section>

      <article class="customers-card customers-management-card">
        <div class="customers-card-header">
          <h3>Customer Management</h3>
        </div>
        <div class="customers-management-list">
          <button id="customersViewButton" class="customers-outline-button" type="button">View Customer Information</button>
          <button id="customersEditButton" class="customers-outline-button" type="button">Update Customer Information</button>
          <button id="customersPurchaseButton" class="customers-outline-button" type="button">Record Customer Purchase</button>
          <button id="customersHistoryButton" class="customers-outline-button" type="button">View Customer Purchase History</button>
          <button id="customersContactButton" class="customers-outline-button" type="button">Record Customer Contact Details</button>
          <button id="customersDeleteButton" class="customers-danger-button" type="button">Manage Customer Records</button>
        </div>
      </article>

      <script id="customersWorkspaceData" type="application/json">${serializedWorkspace}</script>
    </section>
  `;
}

function normalizeCustomersWorkspace(workspace) {
  return {
    customers: Array.isArray(workspace?.customers)
      ? workspace.customers.map((customer) => ({
          ...customer,
          customer_id: Number(customer.customer_id || 0),
          total_purchases: Number(customer.total_purchases || 0),
          purchase_count: Number(customer.purchase_count || 0)
        }))
      : [],
    metrics: workspace?.metrics || {
      total_customers: 0,
      new_customers_month: 0,
      active_buyers: 0,
      repeat_customers: 0
    },
    purchaseHistory: Array.isArray(workspace?.purchaseHistory)
      ? workspace.purchaseHistory.map((entry) => ({
          ...entry,
          customer_id: Number(entry.customer_id || 0),
          sale_id: Number(entry.sale_id || 0),
          total_amount: Number(entry.total_amount || 0),
          item_count: Number(entry.item_count || 0)
        }))
      : []
  };
}

function renderCustomerMetrics(metrics) {
  return `
    <article class="customers-metric-card">
      <h4>Total Customers</h4>
      <strong>${formatNumber(metrics.total_customers || 0)}</strong>
    </article>
    <article class="customers-metric-card">
      <h4>New Customers This Month</h4>
      <strong>${formatNumber(metrics.new_customers_month || 0)}</strong>
    </article>
    <article class="customers-metric-card">
      <h4>Active Buyers</h4>
      <strong>${formatNumber(metrics.active_buyers || 0)}</strong>
    </article>
    <article class="customers-metric-card">
      <h4>Repeat Customers</h4>
      <strong>${formatNumber(metrics.repeat_customers || 0)}</strong>
    </article>
  `;
}

function renderCustomersTable(customers) {
  if (!customers.length) {
    return `<p class="empty-copy">No customer records found.</p>`;
  }

  return `
    <div class="customers-table">
      <div class="customers-table-head">
        <span>Customer ID</span>
        <span>Name</span>
        <span>Contact</span>
        <span>Email</span>
        <span>Address</span>
        <span>Total Purchases</span>
        <span>Last Purchase</span>
        <span>Action</span>
      </div>
      ${customers
        .map(
          (customer) => `
            <div class="customers-table-row">
              <span>CUST-${String(customer.customer_id).padStart(4, "0")}</span>
              <span><strong>${escapeHtml(customer.customer_name)}</strong></span>
              <span>${escapeHtml(customer.phone || "No phone")}</span>
              <span>${escapeHtml(customer.email || "No email")}</span>
              <span>${escapeHtml(customer.address || "No address")}</span>
              <span>${formatCurrency(customer.total_purchases)}</span>
              <span>${customer.last_purchase ? escapeHtml(new Date(customer.last_purchase).toLocaleDateString("en-PH")) : "No purchase yet"}</span>
              <span><button class="customers-outline-button compact" type="button" data-action="select-customer" data-customer-id="${customer.customer_id}">Open</button></span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderCustomerDetails(customer) {
  if (!customer) {
    return `<p class="empty-copy">Select a customer record to view information.</p>`;
  }

  return `
    <div class="customers-detail-block">
      <h4>${escapeHtml(customer.customer_name)}</h4>
      <p>CUST-${String(customer.customer_id).padStart(4, "0")}</p>
      <div class="customers-detail-list">
        <span>${escapeHtml(customer.phone || "No phone")}</span>
        <span>${escapeHtml(customer.email || "No email")}</span>
        <span>${escapeHtml(customer.address || "No address")}</span>
        <span>Recorded: ${escapeHtml(new Date(customer.created_at).toLocaleDateString("en-PH"))}</span>
        <span>Total Purchases: ${formatCurrency(customer.total_purchases)}</span>
      </div>
      <form id="customersEditForm" class="customers-form">
        <label>
          <span>Full Name</span>
          <input name="customer_name" type="text" value="${escapeHtml(customer.customer_name)}" />
        </label>
        <label>
          <span>Contact Number</span>
          <input name="phone" type="text" value="${escapeHtml(customer.phone || "")}" />
        </label>
        <label>
          <span>Email</span>
          <input name="email" type="email" value="${escapeHtml(customer.email || "")}" />
        </label>
        <label class="field-span-2">
          <span>Address</span>
          <input name="address" type="text" value="${escapeHtml(customer.address || "")}" />
        </label>
        <button class="customers-primary-button field-span-2" type="submit">Save Updates</button>
      </form>
    </div>
  `;
}

function renderCustomerPurchaseHistory(history) {
  if (!history.length) {
    return `<p class="empty-copy">No purchase history for this customer yet.</p>`;
  }

  return `
    <div class="customers-history-table">
      <div class="customers-history-head">
        <span>Invoice No.</span>
        <span>Date</span>
        <span>Items</span>
        <span>Total Amount</span>
        <span>Payment Method</span>
      </div>
      ${history
        .map(
          (entry) => `
            <div class="customers-history-row">
              <span>${escapeHtml(entry.invoice_number)}</span>
              <span>${escapeHtml(new Date(entry.sale_date).toLocaleDateString("en-PH"))}</span>
              <span>${formatNumber(entry.item_count)}</span>
              <span>${formatCurrency(entry.total_amount)}</span>
              <span>${escapeHtml(entry.payment_method || "Cash")}</span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

export function initializeCustomersModule() {
  const dataElement = document.getElementById("customersWorkspaceData");
  const alertElement = document.getElementById("customersAlert");
  const metricsElement = document.getElementById("customersMetrics");
  const searchInput = document.getElementById("customersSearchInput");
  const searchButton = document.getElementById("customersSearchButton");
  const tableElement = document.getElementById("customersTable");
  const detailsElement = document.getElementById("customersDetailsPanel");
  const historyElement = document.getElementById("customersPurchaseHistory");
  const addForm = document.getElementById("customersAddForm");
  const viewButton = document.getElementById("customersViewButton");
  const editButton = document.getElementById("customersEditButton");
  const purchaseButton = document.getElementById("customersPurchaseButton");
  const historyButton = document.getElementById("customersHistoryButton");
  const contactButton = document.getElementById("customersContactButton");
  const deleteButton = document.getElementById("customersDeleteButton");

  if (!dataElement || !metricsElement || !tableElement || !detailsElement || !historyElement || !addForm) {
    return;
  }

  let workspace = {};

  try {
    workspace = normalizeCustomersWorkspace(JSON.parse(dataElement.textContent || "{}"));
  } catch {
    workspace = normalizeCustomersWorkspace({});
  }

  const state = {
    customers: workspace.customers,
    metrics: workspace.metrics,
    purchaseHistory: workspace.purchaseHistory,
    searchTerm: "",
    selectedCustomerId: workspace.customers[0]?.customer_id || 0,
    isBusy: false
  };

  function setAlert(message, tone = "info") {
    if (!message) {
      alertElement.hidden = true;
      alertElement.textContent = "";
      alertElement.dataset.tone = "";
      return;
    }

    alertElement.hidden = false;
    alertElement.textContent = message;
    alertElement.dataset.tone = tone;
  }

  function setBusy(nextBusy) {
    state.isBusy = nextBusy;
    [searchInput, searchButton, viewButton, editButton, purchaseButton, historyButton, contactButton, deleteButton].forEach((element) => {
      if (element) {
        element.disabled = nextBusy;
      }
    });

    Array.from(addForm.elements).forEach((element) => {
      element.disabled = nextBusy;
    });

    const editForm = document.getElementById("customersEditForm");
    if (editForm) {
      Array.from(editForm.elements).forEach((element) => {
        element.disabled = nextBusy;
      });
    }
  }

  function getSelectedCustomer() {
    return state.customers.find((customer) => customer.customer_id === state.selectedCustomerId) || null;
  }

  function getFilteredCustomers() {
    const query = String(state.searchTerm || "").trim().toLowerCase();

    return state.customers.filter((customer) => {
      if (!query) {
        return true;
      }

      return (
        customer.customer_name.toLowerCase().includes(query) ||
        String(customer.customer_id).includes(query) ||
        String(customer.phone || "").toLowerCase().includes(query) ||
        String(customer.email || "").toLowerCase().includes(query)
      );
    });
  }

  function getSelectedHistory() {
    return state.purchaseHistory.filter((entry) => entry.customer_id === state.selectedCustomerId);
  }

  function renderAll() {
    metricsElement.innerHTML = renderCustomerMetrics(state.metrics);
    tableElement.innerHTML = renderCustomersTable(getFilteredCustomers());
    detailsElement.innerHTML = renderCustomerDetails(getSelectedCustomer());
    historyElement.innerHTML = renderCustomerPurchaseHistory(getSelectedHistory());
  }

  function replaceWorkspace(nextWorkspace) {
    const normalized = normalizeCustomersWorkspace(nextWorkspace);
    state.customers = normalized.customers;
    state.metrics = normalized.metrics;
    state.purchaseHistory = normalized.purchaseHistory;

    if (!state.customers.some((customer) => customer.customer_id === state.selectedCustomerId)) {
      state.selectedCustomerId = state.customers[0]?.customer_id || 0;
    }

    renderAll();
  }

  replaceWorkspace(workspace);

  async function refreshWorkspace(message) {
    const result = await fetchCustomersWorkspaceApi();
    replaceWorkspace(result);

    if (message) {
      setAlert(message, "success");
    }
  }

  searchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      state.searchTerm = event.target.value;
      renderAll();
    }
  });

  searchButton?.addEventListener("click", () => {
    state.searchTerm = searchInput.value;
    renderAll();
  });

  tableElement.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action='select-customer']");

    if (!button) {
      return;
    }

    state.selectedCustomerId = Number(button.dataset.customerId || 0);
    renderAll();
    setAlert("");
  });

  addForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      setBusy(true);
      const formData = new FormData(addForm);
      const result = await createCustomerRecord(Object.fromEntries(formData.entries()));
      addForm.reset();
      replaceWorkspace(result.workspace || {});
      setAlert("Customer added successfully.", "success");
    } catch (error) {
      setAlert(error.message || "Unable to add customer.", "warning");
    } finally {
      setBusy(false);
    }
  });

  detailsElement.addEventListener("submit", async (event) => {
    const form = event.target.closest("#customersEditForm");

    if (!form) {
      return;
    }

    event.preventDefault();

    try {
      setBusy(true);
      const formData = new FormData(form);
      const result = await updateCustomerRecord(state.selectedCustomerId, Object.fromEntries(formData.entries()));
      replaceWorkspace(result.workspace || {});
      setAlert("Customer information updated successfully.", "success");
    } catch (error) {
      setAlert(error.message || "Unable to update customer.", "warning");
    } finally {
      setBusy(false);
    }
  });

  deleteButton?.addEventListener("click", async () => {
    if (!state.selectedCustomerId) {
      setAlert("Select a customer record first.", "warning");
      return;
    }

    try {
      setBusy(true);
      const result = await deleteCustomerRecord(state.selectedCustomerId);
      replaceWorkspace(result.workspace || {});
      setAlert("Customer record managed successfully.", "success");
    } catch (error) {
      setAlert(error.message || "Unable to manage customer record.", "warning");
    } finally {
      setBusy(false);
    }
  });

  viewButton?.addEventListener("click", () => {
    detailsElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  editButton?.addEventListener("click", () => {
    detailsElement.querySelector("input")?.focus();
  });

  purchaseButton?.addEventListener("click", () => {
    window.location.href = "/sales";
  });

  historyButton?.addEventListener("click", () => {
    historyElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  contactButton?.addEventListener("click", () => {
    detailsElement.querySelector("input[name='phone']")?.focus();
  });
}

export function renderSuppliersModule(workspace) {
  const serializedWorkspace = JSON.stringify(workspace || {}).replaceAll("</script", "<\\/script");

  return `
    <section class="suppliers-screen">
      <header class="suppliers-hero">
        <div>
          <p class="eyebrow">Supplier</p>
          <h2 class="suppliers-page-heading">Suppliers</h2>
        </div>
        <div class="suppliers-toolbar">
          <input id="suppliersSearchInput" type="search" placeholder="Search supplier..." />
          <select id="suppliersStatusFilter">
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <button id="suppliersAddToggleButton" class="suppliers-primary-button" type="button">Add Supplier</button>
        </div>
      </header>

      <div id="suppliersAlert" class="suppliers-alert" hidden></div>
      <section id="suppliersMetrics" class="suppliers-metrics-grid"></section>

      <section class="suppliers-main-grid">
        <article class="suppliers-card suppliers-list-card">
          <div class="suppliers-card-header">
            <h3>Suppliers List</h3>
          </div>
          <div id="suppliersTable" class="suppliers-table-wrap"></div>
        </article>

        <article class="suppliers-card suppliers-details-card">
          <div class="suppliers-card-header">
            <h3>Supplier Details</h3>
          </div>
          <div id="suppliersDetailsPanel" class="suppliers-details-panel"></div>
        </article>
      </section>

      <section class="suppliers-bottom-grid">
        <article class="suppliers-card">
          <div class="suppliers-card-header">
            <h3>Add / Update Supplier</h3>
          </div>
          <form id="suppliersForm" class="suppliers-form">
            <label>
              <span>Supplier Name</span>
              <input name="supplier_name" type="text" placeholder="Supplier name" required />
            </label>
            <label>
              <span>Contact Person</span>
              <input name="contact_person" type="text" placeholder="Contact person" />
            </label>
            <label>
              <span>Phone</span>
              <input name="phone" type="text" placeholder="Phone" />
            </label>
            <label>
              <span>Email</span>
              <input name="email" type="email" placeholder="Email" />
            </label>
            <label class="field-span-2">
              <span>Address</span>
              <input name="address" type="text" placeholder="Address" />
            </label>
            <label>
              <span>TIN</span>
              <input name="tin" type="text" placeholder="TIN" />
            </label>
            <label>
              <span>Payment Terms</span>
              <input name="payment_terms" type="text" placeholder="e.g. 30 Days" />
            </label>
            <label>
              <span>Status</span>
              <select name="status">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>
            <button id="suppliersSaveButton" class="suppliers-primary-button field-span-2" type="submit">Save Supplier</button>
          </form>
        </article>

        <article class="suppliers-card">
          <div class="suppliers-card-header">
            <h3>Create Purchase / Stock Order</h3>
          </div>
          <form id="supplierPurchaseForm" class="suppliers-form">
            <label class="field-span-2">
              <span>Supplier</span>
              <select name="supplier_id" id="supplierPurchaseSupplierSelect"></select>
            </label>
            <label class="field-span-2">
              <span>Jewelry / Product Supplied</span>
              <select name="product_id" id="supplierPurchaseProductSelect"></select>
            </label>
            <label>
              <span>Quantity</span>
              <input name="quantity" type="number" min="1" step="1" value="1" />
            </label>
            <label>
              <span>Unit Cost</span>
              <input name="unit_cost" type="number" min="0" step="0.01" value="0" />
            </label>
            <label>
              <span>Payment Status</span>
              <select name="payment_status">
                <option value="Unpaid">Unpaid</option>
                <option value="Partial">Partial</option>
                <option value="Paid">Paid</option>
              </select>
            </label>
            <button class="suppliers-primary-button field-span-2" type="submit">Create Purchase Order</button>
          </form>
        </article>
      </section>

      <article class="suppliers-card">
        <div class="suppliers-card-header">
          <h3>Supplier Transaction History</h3>
        </div>
        <div id="suppliersTransactions" class="suppliers-transactions-wrap"></div>
      </article>

      <script id="suppliersWorkspaceData" type="application/json">${serializedWorkspace}</script>
    </section>
  `;
}

function normalizeSuppliersWorkspace(workspace) {
  return {
    suppliers: Array.isArray(workspace?.suppliers)
      ? workspace.suppliers.map((supplier) => ({
          ...supplier,
          supplier_id: Number(supplier.supplier_id || 0),
          purchase_count: Number(supplier.purchase_count || 0),
          total_purchase_amount: Number(supplier.total_purchase_amount || 0)
        }))
      : [],
    metrics: workspace?.metrics || {
      total_suppliers: 0,
      active_suppliers: 0,
      total_purchases: 0,
      total_paid: 0,
      outstanding: 0
    },
    products: Array.isArray(workspace?.products) ? workspace.products.map((product) => ({
      ...product,
      product_id: Number(product.product_id || 0),
      purchase_price: Number(product.purchase_price || 0)
    })) : [],
    transactions: Array.isArray(workspace?.transactions) ? workspace.transactions.map((entry) => ({
      ...entry,
      purchase_id: Number(entry.purchase_id || 0),
      supplier_id: Number(entry.supplier_id || 0),
      total_amount: Number(entry.total_amount || 0),
      total_items: Number(entry.total_items || 0),
      received_count: Number(entry.received_count || 0)
    })) : []
  };
}

function renderSupplierMetrics(metrics) {
  return `
    <article class="suppliers-metric-card"><h4>Total Suppliers</h4><strong>${formatNumber(metrics.total_suppliers || 0)}</strong></article>
    <article class="suppliers-metric-card"><h4>Active Suppliers</h4><strong>${formatNumber(metrics.active_suppliers || 0)}</strong></article>
    <article class="suppliers-metric-card"><h4>Total Purchases</h4><strong>${formatNumber(metrics.total_purchases || 0)}</strong></article>
    <article class="suppliers-metric-card"><h4>Total Paid</h4><strong>${formatCurrency(metrics.total_paid || 0)}</strong></article>
    <article class="suppliers-metric-card"><h4>Outstanding</h4><strong>${formatCurrency(metrics.outstanding || 0)}</strong></article>
  `;
}

function renderSuppliersTable(suppliers) {
  if (!suppliers.length) {
    return `<p class="empty-copy">No suppliers found.</p>`;
  }

  return `
    <div class="suppliers-table">
      <div class="suppliers-table-head">
        <span>Supplier ID</span><span>Supplier Name</span><span>Contact Person</span><span>Phone</span><span>Email</span><span>Status</span><span>Actions</span>
      </div>
      ${suppliers.map((supplier) => `
        <div class="suppliers-table-row">
          <span>SUP-${String(supplier.supplier_id).padStart(3, "0")}</span>
          <span><strong>${escapeHtml(supplier.supplier_name)}</strong></span>
          <span>${escapeHtml(supplier.contact_person || "No contact")}</span>
          <span>${escapeHtml(supplier.phone || "No phone")}</span>
          <span>${escapeHtml(supplier.email || "No email")}</span>
          <span class="supplier-status ${String(supplier.status || "Active").toLowerCase()}">${escapeHtml(supplier.status || "Active")}</span>
          <span><button class="suppliers-outline-button compact" type="button" data-action="select-supplier" data-supplier-id="${supplier.supplier_id}">Open</button></span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderSupplierDetails(supplier) {
  if (!supplier) {
    return `<p class="empty-copy">Select a supplier to view details.</p>`;
  }

  return `
    <div class="suppliers-detail-block">
      <h4>${escapeHtml(supplier.supplier_name)}</h4>
      <p>SUP-${String(supplier.supplier_id).padStart(3, "0")}</p>
      <div class="suppliers-detail-list">
        <span>Contact Person: ${escapeHtml(supplier.contact_person || "No contact")}</span>
        <span>Phone: ${escapeHtml(supplier.phone || "No phone")}</span>
        <span>Email: ${escapeHtml(supplier.email || "No email")}</span>
        <span>Address: ${escapeHtml(supplier.address || "No address")}</span>
        <span>TIN: ${escapeHtml(supplier.tin || "No TIN")}</span>
        <span>Payment Terms: ${escapeHtml(supplier.payment_terms || "No terms")}</span>
        <span>Status: ${escapeHtml(supplier.status || "Active")}</span>
        <span>Total Purchases: ${formatCurrency(supplier.total_purchase_amount)}</span>
      </div>
      <button class="suppliers-outline-button suppliers-detail-delete" type="button" data-action="delete-supplier" data-supplier-id="${supplier.supplier_id}">
        Delete / Deactivate Supplier
      </button>
    </div>
  `;
}

function renderSupplierTransactions(transactions) {
  if (!transactions.length) {
    return `<p class="empty-copy">No supplier transaction history yet.</p>`;
  }

  return `
    <div class="suppliers-transactions-table">
      <div class="suppliers-transactions-head">
        <span>Purchase No.</span><span>Supplier</span><span>Date</span><span>Items</span><span>Total Amount</span><span>Payment</span><span>Delivery</span><span>Action</span>
      </div>
      ${transactions.map((entry) => `
        <div class="suppliers-transactions-row">
          <span>${escapeHtml(entry.purchase_number)}</span>
          <span>${escapeHtml(entry.supplier_name)}</span>
          <span>${escapeHtml(new Date(entry.purchase_date).toLocaleDateString("en-PH"))}</span>
          <span>${formatNumber(entry.total_items)}</span>
          <span>${formatCurrency(entry.total_amount)}</span>
          <span>${escapeHtml(entry.payment_status || "Unpaid")}</span>
          <span>${entry.received_count > 0 ? "Received" : "Pending"}</span>
          <span><button class="suppliers-outline-button compact" type="button" data-action="receive-purchase" data-purchase-id="${entry.purchase_id}" ${entry.received_count > 0 ? "disabled" : ""}>Receive</button></span>
        </div>
      `).join("")}
    </div>
  `;
}

export function initializeSuppliersModule() {
  const dataElement = document.getElementById("suppliersWorkspaceData");
  const alertElement = document.getElementById("suppliersAlert");
  const metricsElement = document.getElementById("suppliersMetrics");
  const searchInput = document.getElementById("suppliersSearchInput");
  const statusFilter = document.getElementById("suppliersStatusFilter");
  const tableElement = document.getElementById("suppliersTable");
  const detailsElement = document.getElementById("suppliersDetailsPanel");
  const suppliersForm = document.getElementById("suppliersForm");
  const transactionsElement = document.getElementById("suppliersTransactions");
  const purchaseForm = document.getElementById("supplierPurchaseForm");
  const purchaseSupplierSelect = document.getElementById("supplierPurchaseSupplierSelect");
  const purchaseProductSelect = document.getElementById("supplierPurchaseProductSelect");
  const addToggleButton = document.getElementById("suppliersAddToggleButton");
  const currentUser = getUser();

  if (!dataElement || !metricsElement || !tableElement || !detailsElement || !suppliersForm || !transactionsElement || !purchaseForm) {
    return;
  }

  let workspace = {};
  try {
    workspace = normalizeSuppliersWorkspace(JSON.parse(dataElement.textContent || "{}"));
  } catch {
    workspace = normalizeSuppliersWorkspace({});
  }

  const state = {
    suppliers: workspace.suppliers,
    metrics: workspace.metrics,
    products: workspace.products,
    transactions: workspace.transactions,
    searchTerm: "",
    filterStatus: "all",
    selectedSupplierId: workspace.suppliers[0]?.supplier_id || 0,
    isBusy: false
  };

  function setAlert(message, tone = "info") {
    if (!message) {
      alertElement.hidden = true;
      alertElement.textContent = "";
      alertElement.dataset.tone = "";
      return;
    }
    alertElement.hidden = false;
    alertElement.textContent = message;
    alertElement.dataset.tone = tone;
  }

  function setBusy(nextBusy) {
    state.isBusy = nextBusy;
    [searchInput, statusFilter, addToggleButton, purchaseSupplierSelect, purchaseProductSelect].forEach((element) => {
      if (element) {
        element.disabled = nextBusy;
      }
    });
    [suppliersForm, purchaseForm].forEach((form) => {
      Array.from(form.elements).forEach((element) => {
        element.disabled = nextBusy;
      });
    });
  }

  function getSelectedSupplier() {
    return state.suppliers.find((supplier) => supplier.supplier_id === state.selectedSupplierId) || null;
  }

  function getFilteredSuppliers() {
    const query = String(state.searchTerm || "").trim().toLowerCase();
    return state.suppliers.filter((supplier) => {
      const matchesQuery = !query ||
        supplier.supplier_name.toLowerCase().includes(query) ||
        String(supplier.contact_person || "").toLowerCase().includes(query) ||
        String(supplier.phone || "").toLowerCase().includes(query) ||
        String(supplier.email || "").toLowerCase().includes(query);
      const matchesStatus = state.filterStatus === "all" || String(supplier.status || "Active") === state.filterStatus;
      return matchesQuery && matchesStatus;
    });
  }

  function syncSupplierForm() {
    const supplier = getSelectedSupplier();
    if (!supplier) {
      suppliersForm.reset();
      return;
    }
    suppliersForm.elements.supplier_name.value = supplier.supplier_name || "";
    suppliersForm.elements.contact_person.value = supplier.contact_person || "";
    suppliersForm.elements.phone.value = supplier.phone || "";
    suppliersForm.elements.email.value = supplier.email || "";
    suppliersForm.elements.address.value = supplier.address || "";
    suppliersForm.elements.tin.value = supplier.tin || "";
    suppliersForm.elements.payment_terms.value = supplier.payment_terms || "";
    suppliersForm.elements.status.value = supplier.status || "Active";
  }

  function syncPurchaseSelects() {
    purchaseSupplierSelect.innerHTML = state.suppliers
      .map((supplier) => `<option value="${supplier.supplier_id}">${escapeHtml(supplier.supplier_name)}</option>`)
      .join("");
    purchaseProductSelect.innerHTML = state.products
      .map((product) => `<option value="${product.product_id}" data-cost="${product.purchase_price}">${escapeHtml(product.product_code)} - ${escapeHtml(product.product_name)}</option>`)
      .join("");
  }

  function renderAll() {
    metricsElement.innerHTML = renderSupplierMetrics(state.metrics);
    tableElement.innerHTML = renderSuppliersTable(getFilteredSuppliers());
    detailsElement.innerHTML = renderSupplierDetails(getSelectedSupplier());
    transactionsElement.innerHTML = renderSupplierTransactions(
      state.transactions.filter((entry) => !state.selectedSupplierId || entry.supplier_id === state.selectedSupplierId)
    );
    syncPurchaseSelects();
    syncSupplierForm();
  }

  function replaceWorkspace(nextWorkspace) {
    const normalized = normalizeSuppliersWorkspace(nextWorkspace);
    state.suppliers = normalized.suppliers;
    state.metrics = normalized.metrics;
    state.products = normalized.products;
    state.transactions = normalized.transactions;
    if (!state.suppliers.some((supplier) => supplier.supplier_id === state.selectedSupplierId)) {
      state.selectedSupplierId = state.suppliers[0]?.supplier_id || 0;
    }
    renderAll();
  }

  replaceWorkspace(workspace);

  searchInput?.addEventListener("input", (event) => {
    state.searchTerm = event.target.value;
    renderAll();
  });

  statusFilter?.addEventListener("change", (event) => {
    state.filterStatus = event.target.value;
    renderAll();
  });

  addToggleButton?.addEventListener("click", () => {
    state.selectedSupplierId = 0;
    suppliersForm.reset();
    setAlert("Enter the supplier details below to add a new supplier.", "info");
  });

  tableElement.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action='select-supplier']");
    if (!button) {
      return;
    }
    state.selectedSupplierId = Number(button.dataset.supplierId || 0);
    renderAll();
    setAlert("");
  });

  suppliersForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      setBusy(true);
      const formData = Object.fromEntries(new FormData(suppliersForm).entries());
      const result = state.selectedSupplierId
        ? await updateSupplierRecord(state.selectedSupplierId, formData)
        : await createSupplierRecord(formData);
      replaceWorkspace(result.workspace || {});
      setAlert(result.message || "Supplier saved successfully.", "success");
      if (!state.selectedSupplierId) {
        state.selectedSupplierId = result.workspace?.suppliers?.slice(-1)?.[0]?.supplier_id || state.selectedSupplierId;
      }
    } catch (error) {
      setAlert(error.message || "Unable to save supplier.", "warning");
    } finally {
      setBusy(false);
    }
  });

  purchaseProductSelect?.addEventListener("change", () => {
    const selected = purchaseProductSelect.selectedOptions[0];
    if (selected) {
      purchaseForm.elements.unit_cost.value = selected.dataset.cost || "0";
    }
  });

  purchaseForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      setBusy(true);
      const formData = new FormData(purchaseForm);
      const result = await createSupplierPurchase({
        supplier_id: formData.get("supplier_id"),
        payment_status: formData.get("payment_status"),
        employee_id: currentUser?.id,
        items: [
          {
            product_id: formData.get("product_id"),
            quantity: formData.get("quantity"),
            unit_cost: formData.get("unit_cost")
          }
        ]
      });
      replaceWorkspace(result.workspace || {});
      setAlert(result.message || "Purchase order created successfully.", "success");
    } catch (error) {
      setAlert(error.message || "Unable to create purchase order.", "warning");
    } finally {
      setBusy(false);
    }
  });

  transactionsElement.addEventListener("click", async (event) => {
    const receiveButton = event.target.closest("[data-action='receive-purchase']");
    if (!receiveButton) {
      return;
    }
    try {
      setBusy(true);
      const result = await receiveSupplierPurchase(receiveButton.dataset.purchaseId, {
        employee_id: currentUser?.id
      });
      replaceWorkspace(result.workspace || {});
      setAlert(result.message || "Delivered stock received successfully.", "success");
      window.dispatchEvent(new Event("inventory:refresh"));
    } catch (error) {
      setAlert(error.message || "Unable to receive delivered stock.", "warning");
    } finally {
      setBusy(false);
    }
  });

  detailsElement.addEventListener("click", async (event) => {
    const deleteButton = event.target.closest("[data-action='delete-supplier']");
    if (!deleteButton) {
      return;
    }
    try {
      setBusy(true);
      const result = await deleteSupplierRecord(deleteButton.dataset.supplierId);
      replaceWorkspace(result.workspace || {});
      setAlert(result.message || "Supplier record managed successfully.", "success");
    } catch (error) {
      setAlert(error.message || "Unable to manage supplier record.", "warning");
    } finally {
      setBusy(false);
    }
  });
}

export function renderInventoryModule(items) {
  const serializedItems = JSON.stringify(items || []).replaceAll("</script", "<\\/script");

  return `
    <section class="inventory-screen">
      <header class="inventory-hero">
        <div>
          <h2 class="inventory-page-heading">Inventory</h2>
        </div>
        <div class="inventory-toolbar">
          <input id="inventorySearchInput" type="search" placeholder="Enter item name, code, or category" />
          <button id="inventorySearchButton" class="inventory-search-button" type="button">Search</button>
          <select id="inventoryFilterSelect" aria-label="Inventory Filter">
            <option value="all">All Items</option>
            <option value="low-stock">Low Stock</option>
            <option value="in-stock">In Stock</option>
            <option value="out-of-stock">Out of Stock</option>
          </select>
          <button id="inventoryAddToggleButton" class="inventory-add-button" type="button">Add Items</button>
        </div>
      </header>

      <div id="inventoryAlert" class="inventory-alert" hidden></div>

      <section class="inventory-management-panels">
        <article id="inventoryAddPanel" class="module-card inventory-form-card" hidden>
          <div class="inventory-panel-heading">
            <h3>Add Product</h3>
            <button id="inventoryAddCloseButton" class="panel-close-button" type="button">Close</button>
          </div>
          <form id="inventoryAddForm" class="inventory-form">
            <label>
              <span>Product Code</span>
              <input name="product_code" type="text" placeholder="JW-101" required />
            </label>
            <label>
              <span>Item Name</span>
              <input name="product_name" type="text" placeholder="Gold Pendant" required />
            </label>
            <label>
              <span>Category</span>
              <input name="category_name" type="text" placeholder="Necklace" required />
            </label>
            <label>
              <span>Item Cost</span>
              <input name="selling_price" type="number" min="0" step="0.01" placeholder="0.00" required />
            </label>
            <label>
              <span>Quantity</span>
              <input name="stock_quantity" type="number" min="0" step="1" placeholder="0" required />
            </label>
            <label>
              <span>Available</span>
              <input name="reorder_level" type="number" min="0" step="1" placeholder="5" required />
            </label>
            <label>
              <span>Material</span>
              <input name="material" type="text" placeholder="Gold" />
            </label>
            <label>
              <span>Description</span>
              <input name="gemstone" type="text" placeholder="Diamond / product details" />
            </label>
            <button class="inventory-submit-button" type="submit">Save Item</button>
          </form>
        </article>

        <article id="inventoryEditorPanel" class="module-card inventory-form-card" hidden>
          <div class="inventory-panel-heading">
            <h3>Manage Item</h3>
            <button id="inventoryEditorCloseButton" class="panel-close-button" type="button">Close</button>
          </div>
          <form id="inventoryUpdateForm" class="inventory-form">
            <label class="field-span-2">
              <span>Select Product</span>
              <select name="selected_product" id="inventoryProductSelect"></select>
            </label>
            <label>
              <span>Item Name</span>
              <input name="product_name" type="text" />
            </label>
            <label>
              <span>Category</span>
              <input name="category_name" type="text" />
            </label>
            <label>
              <span>Item Cost</span>
              <input name="selling_price" type="number" min="0" step="0.01" />
            </label>
            <label>
              <span>Available Level</span>
              <input name="reorder_level" type="number" min="0" step="1" />
            </label>
            <label>
              <span>Material</span>
              <input name="material" type="text" />
            </label>
            <label>
              <span>Description</span>
              <input name="gemstone" type="text" />
            </label>
            <div class="field-span-2 inventory-action-row">
              <label>
                <span>Quantity</span>
                <input name="quantity_change" type="number" min="1" step="1" value="1" />
              </label>
              <div class="inventory-button-cluster">
                <button class="ghost-button" type="submit" name="action" value="update">Update</button>
                <button class="ghost-button" type="submit" name="action" value="add-stock">Add Stock</button>
                <button class="ghost-button" type="submit" name="action" value="reduce-stock">Reduce Stock</button>
                <button class="ghost-button" type="submit" name="action" value="record-damaged">Damaged</button>
                <button class="ghost-button" type="submit" name="action" value="restock">Restock</button>
              </div>
            </div>
          </form>
        </article>
      </section>

      <div id="inventoryReport" class="inventory-report-grid"></div>

      <article class="inventory-table-card">
        <div id="inventoryTable" class="inventory-table-wrap"></div>
      </article>

      <script id="inventoryModuleData" type="application/json">${serializedItems}</script>
    </section>
  `;
}

function normalizeInventoryItem(item) {
  const stockQuantity = Number(item.stock_quantity || 0);
  const reorderLevel = Number(item.reorder_level || 0);

  return {
    product_code: item.product_code || "",
    product_name: item.product_name || "",
    category_name: item.category_name || "",
    stock_quantity: stockQuantity,
    reorder_level: reorderLevel,
    stock_status: getStockStatus(stockQuantity, reorderLevel),
    selling_price: Number(item.selling_price || 0),
    material: item.material || "",
    gemstone: item.gemstone || "",
    damaged_quantity: Number(item.damaged_quantity || 0),
    sold_quantity: Number(item.sold_quantity || 0)
  };
}

function getStockStatus(stockQuantity, reorderLevel) {
  if (stockQuantity <= 0) {
    return "Out of Stock";
  }

  if (stockQuantity <= reorderLevel) {
    return "Low Stock";
  }

  return "In Stock";
}

function renderInventoryTable(items) {
  if (!items.length) {
    return `<p class="empty-copy">No inventory rows found.</p>`;
  }

  return `
    <div class="inventory-table">
      <div class="inventory-table-head">
        <span>Sno</span>
        <span>Item Name</span>
        <span>Item Cost</span>
        <span>Description</span>
        <span>Stock</span>
        <span>Available</span>
        <span>Actions</span>
      </div>
      ${items
        .map(
          (item, index) => `
            <div class="inventory-table-row" data-product-code="${escapeHtml(item.product_code)}">
              <span>
                ${formatNumber(index + 1)}
              </span>
              <span>
                <strong>${escapeHtml(item.product_name)}</strong>
                <small>${escapeHtml(item.product_code)} | ${escapeHtml(item.category_name)}</small>
              </span>
              <span><span class="inventory-cost-pill">${formatCurrency(item.selling_price)}</span></span>
              <span>${escapeHtml(item.material || "No material")} | ${escapeHtml(item.gemstone || "No details")}</span>
              <span>${formatNumber(item.stock_quantity + item.sold_quantity + item.damaged_quantity)}</span>
              <span>${formatNumber(item.stock_quantity)}</span>
              <span>
                <button class="inventory-row-button" type="button" data-action="manage" data-product-code="${escapeHtml(item.product_code)}">
                  Manage Item
                </button>
              </span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderInventoryReport(items) {
  const available = items.reduce((sum, item) => sum + Number(item.stock_quantity || 0), 0);
  const lowStock = items.filter((item) => item.stock_quantity <= item.reorder_level).length;
  const damaged = items.reduce((sum, item) => sum + Number(item.damaged_quantity || 0), 0);
  const sold = items.reduce((sum, item) => sum + Number(item.sold_quantity || 0), 0);

  return `
    <article class="report-card">
      <h4>Available Units</h4>
      <strong>${formatNumber(available)}</strong>
    </article>
    <article class="report-card warning">
      <h4>Low Stock Items</h4>
      <strong>${formatNumber(lowStock)}</strong>
    </article>
    <article class="report-card">
      <h4>Sold Units</h4>
      <strong>${formatNumber(sold)}</strong>
    </article>
    <article class="report-card danger">
      <h4>Damaged Units</h4>
      <strong>${formatNumber(damaged)}</strong>
    </article>
  `;
}

function getFilteredInventory(items, searchTerm, filterValue) {
  const query = String(searchTerm || "").trim().toLowerCase();

  return items.filter((item) => {
    const matchesSearch =
      !query ||
      item.product_name.toLowerCase().includes(query) ||
      item.product_code.toLowerCase().includes(query) ||
      item.category_name.toLowerCase().includes(query);
    const matchesFilter =
      filterValue === "all" ||
      (filterValue === "low-stock" && item.stock_quantity <= item.reorder_level && item.stock_quantity > 0) ||
      (filterValue === "in-stock" && item.stock_quantity > item.reorder_level) ||
      (filterValue === "out-of-stock" && item.stock_quantity <= 0);

    return matchesSearch && matchesFilter;
  });
}

export function initializeInventoryModule() {
  const dataElement = document.getElementById("inventoryModuleData");
  const productSelect = document.getElementById("inventoryProductSelect");
  const addForm = document.getElementById("inventoryAddForm");
  const updateForm = document.getElementById("inventoryUpdateForm");
  const searchInput = document.getElementById("inventorySearchInput");
  const searchButton = document.getElementById("inventorySearchButton");
  const filterSelect = document.getElementById("inventoryFilterSelect");
  const addToggleButton = document.getElementById("inventoryAddToggleButton");
  const addCloseButton = document.getElementById("inventoryAddCloseButton");
  const editorCloseButton = document.getElementById("inventoryEditorCloseButton");
  const addPanel = document.getElementById("inventoryAddPanel");
  const editorPanel = document.getElementById("inventoryEditorPanel");
  const alertElement = document.getElementById("inventoryAlert");
  const reportElement = document.getElementById("inventoryReport");
  const tableElement = document.getElementById("inventoryTable");
  const currentUser = getUser();

  if (!dataElement || !productSelect || !addForm || !updateForm || !tableElement) {
    return;
  }

  let initialItems = [];

  try {
    initialItems = JSON.parse(dataElement.textContent || "[]").map(normalizeInventoryItem);
  } catch {
    initialItems = [];
  }

  const state = {
    items: initialItems,
    searchTerm: "",
    filterValue: "all",
    isBusy: false
  };

  function setBusy(nextBusy) {
    state.isBusy = nextBusy;

    [addForm, updateForm].forEach((form) => {
      if (!form) {
        return;
      }

      Array.from(form.elements).forEach((element) => {
        element.disabled = nextBusy;
      });
    });

    [searchInput, searchButton, filterSelect, addToggleButton].forEach((element) => {
      if (element) {
        element.disabled = nextBusy;
      }
    });
  }

  function syncProductSelect() {
    productSelect.innerHTML = state.items
      .map(
        (item) =>
          `<option value="${escapeHtml(item.product_code)}">${escapeHtml(item.product_code)} - ${escapeHtml(item.product_name)}</option>`
      )
      .join("");
  }

  function fillUpdateForm(productCode) {
    const item = state.items.find((entry) => entry.product_code === productCode);

    if (!item) {
      return;
    }

    updateForm.elements.selected_product.value = item.product_code;
    updateForm.elements.product_name.value = item.product_name;
    updateForm.elements.category_name.value = item.category_name;
    updateForm.elements.selling_price.value = item.selling_price;
    updateForm.elements.reorder_level.value = item.reorder_level;
    updateForm.elements.material.value = item.material;
    updateForm.elements.gemstone.value = item.gemstone;
  }

  function render() {
    const filteredItems = getFilteredInventory(state.items, state.searchTerm, state.filterValue);
    tableElement.innerHTML = renderInventoryTable(filteredItems);
    reportElement.innerHTML = renderInventoryReport(state.items);

    const lowStockItems = state.items.filter((item) => item.stock_quantity <= item.reorder_level);
    if (lowStockItems.length) {
      alertElement.hidden = false;
      alertElement.textContent = `${lowStockItems.length} product(s) need attention because they are low on stock.`;
    } else {
      alertElement.hidden = true;
      alertElement.textContent = "";
    }
  }

  function replaceItems(items) {
    state.items = items.map(normalizeInventoryItem);
    syncProductSelect();

    if (state.items.length) {
      const selectedValue = updateForm.elements.selected_product.value;
      const hasSelectedItem = state.items.some((item) => item.product_code === selectedValue);
      fillUpdateForm(hasSelectedItem ? selectedValue : state.items[0].product_code);
    }

    render();
  }

  replaceItems(state.items);

  function openAddPanel() {
    if (addPanel) {
      addPanel.hidden = false;
    }
  }

  function closeAddPanel() {
    if (addPanel) {
      addPanel.hidden = true;
    }
  }

  function openEditorPanel(productCode) {
    if (editorPanel) {
      editorPanel.hidden = false;
    }

    fillUpdateForm(productCode);
  }

  function closeEditorPanel() {
    if (editorPanel) {
      editorPanel.hidden = true;
    }
  }

  addForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(addForm);
    const productCode = String(formData.get("product_code") || "").trim();

    if (state.items.some((item) => item.product_code === productCode)) {
      alert("Product code already exists.");
      return;
    }

    try {
      setBusy(true);
      const result = await createInventoryProduct({
        ...Object.fromEntries(formData.entries()),
        employee_id: currentUser?.id
      });

      addForm.reset();
      replaceItems(result.items || []);
      openEditorPanel(productCode);
      closeAddPanel();
    } catch (error) {
      alert(error.message || "Unable to create product.");
    } finally {
      setBusy(false);
    }
  });

  productSelect.addEventListener("change", (event) => {
    fillUpdateForm(event.target.value);
  });

  updateForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitter = event.submitter;
    const action = submitter?.value || "update";
    const productCode = String(updateForm.elements.selected_product.value || "");
    const item = state.items.find((entry) => entry.product_code === productCode);

    if (!item) {
      return;
    }

    const quantityChange = Math.max(1, Number(updateForm.elements.quantity_change.value || 1));

    try {
      setBusy(true);

      let result;

      if (action === "update") {
        result = await updateInventoryProduct(productCode, {
          product_name: updateForm.elements.product_name.value,
          category_name: updateForm.elements.category_name.value,
          selling_price: updateForm.elements.selling_price.value,
          reorder_level: updateForm.elements.reorder_level.value,
          material: updateForm.elements.material.value,
          gemstone: updateForm.elements.gemstone.value,
          description: updateForm.elements.gemstone.value
        });
      } else {
        result = await applyInventoryAction(productCode, {
          action,
          quantity: quantityChange,
          employee_id: currentUser?.id
        });
      }

      replaceItems(result.items || []);
      fillUpdateForm(productCode);
    } catch (error) {
      alert(error.message || "Unable to update inventory.");
    } finally {
      setBusy(false);
    }
  });

  function applySearch() {
    state.searchTerm = searchInput?.value || "";
    render();
  }

  searchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applySearch();
    }
  });

  searchButton?.addEventListener("click", () => {
    applySearch();
  });

  filterSelect?.addEventListener("change", (event) => {
    state.filterValue = event.target.value;
    render();
  });

  addToggleButton?.addEventListener("click", () => {
    openAddPanel();
  });

  addCloseButton?.addEventListener("click", () => {
    closeAddPanel();
  });

  editorCloseButton?.addEventListener("click", () => {
    closeEditorPanel();
  });

  tableElement.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action='manage']");

    if (!button) {
      return;
    }

    openEditorPanel(button.dataset.productCode || "");
  });

  window.addEventListener("inventory:refresh", async () => {
    try {
      const result = await fetchInventoryData();
      replaceItems(result.items || []);
    } catch {
      // Keep the existing screen state if background refresh fails.
    }
  });
}

export function renderSalesModule(workspace) {
  const serializedWorkspace = JSON.stringify(workspace || {}).replaceAll("</script", "<\\/script");

  return `
    <section class="sales-screen">
      <header class="sales-hero">
        <div>
          <p class="eyebrow">Sales Module</p>
          <h2 class="sales-page-heading">Sales</h2>
        </div>
      </header>

      <div id="salesAlert" class="sales-alert" hidden></div>

      <section class="sales-grid">
        <article class="sales-card product-search-card">
          <div class="sales-card-header">
            <h3>Search Jewelry Product</h3>
          </div>
          <div class="sales-product-toolbar">
            <input id="salesProductSearchInput" type="search" placeholder="Search by product code, name, or category" />
            <button id="salesProductSearchButton" class="sales-primary-button" type="button">Search</button>
            <select id="salesProductFilterSelect">
              <option value="all">All Items</option>
              <option value="available">Available</option>
              <option value="low-stock">Low Stock</option>
            </select>
          </div>
          <div id="salesProductList" class="sales-product-list"></div>
        </article>

        <article class="sales-card cart-card">
          <div class="sales-card-header">
            <h3>Current Sale (Cart)</h3>
            <button id="salesClearCartButton" class="sales-outline-button" type="button">Clear Cart</button>
          </div>
          <div id="salesCartTable" class="sales-cart-table"></div>
          <textarea id="salesNoteInput" class="sales-note-input" placeholder="Add notes to this sale (optional)"></textarea>
        </article>
      </section>

      <section class="sales-meta-grid">
        <article class="sales-card">
          <div class="sales-card-header">
            <h3>Customer</h3>
          </div>
          <select id="salesCustomerSelect"></select>
          <div class="sales-customer-meta">
            <span id="salesCustomerEmail">No email</span>
            <span id="salesCustomerPhone">No phone</span>
          </div>
          <button id="salesAddCustomerToggleButton" class="sales-outline-button" type="button">Add New Customer</button>
          <form id="salesCustomerForm" class="sales-inline-form" hidden>
            <input name="customer_name" type="text" placeholder="Customer name" />
            <input name="phone" type="text" placeholder="Phone" />
            <input name="email" type="email" placeholder="Email" />
            <input name="address" type="text" placeholder="Address" />
          </form>
        </article>

        <article class="sales-card">
          <div class="sales-card-header">
            <h3>Payment Method</h3>
          </div>
          <div class="sales-radio-list">
            <label><input type="radio" name="salesPaymentMethod" value="Cash" checked />Cash</label>
            <label><input type="radio" name="salesPaymentMethod" value="GCash" />GCash</label>
            <label><input type="radio" name="salesPaymentMethod" value="Credit Card" />Card</label>
            <label><input type="radio" name="salesPaymentMethod" value="Bank Transfer" />Other</label>
          </div>
          <input id="salesReferenceInput" type="text" placeholder="Reference number (optional)" />
        </article>

        <article class="sales-card totals-summary-card">
          <div class="sales-card-header">
            <h3>Totals Summary</h3>
          </div>
          <div id="salesTotalsSummary" class="sales-totals-summary"></div>
        </article>
      </section>

      <section class="sales-actions-grid">
        <article class="sales-card payment-details-card">
          <div class="sales-card-header">
            <h3>Payment Details</h3>
          </div>
          <div class="sales-inline-grid">
            <label>
              <span>Amount Paid (₱)</span>
              <input id="salesAmountPaidInput" type="number" min="0" step="0.01" value="0" />
            </label>
            <label>
              <span>Change (₱)</span>
              <input id="salesChangeOutput" type="text" value="0.00" readonly />
            </label>
          </div>
        </article>

        <div class="sales-action-buttons">
          <button id="salesProcessPaymentButton" class="sales-success-button" type="button">Process Payment</button>
          <button id="salesConfirmButton" class="sales-primary-button" type="button">Confirm Sale</button>
          <button id="salesPrintButton" class="sales-outline-button" type="button">Print Receipt</button>
          <button id="salesCancelButton" class="sales-danger-button" type="button">Cancel / Void Sale</button>
        </div>
      </section>

      <section class="sales-history-grid">
        <article class="sales-card">
          <div class="sales-card-header">
            <h3>Recent Sales</h3>
          </div>
          <div id="salesHistoryTable" class="sales-history-table"></div>
        </article>

        <article class="sales-card sales-report-card">
          <div class="sales-card-header">
            <h3>Generate Sales Report</h3>
          </div>
          <p>View sales performance totals and refresh the current report summary.</p>
          <div id="salesReportSummary" class="sales-report-summary"></div>
          <button id="salesReportButton" class="sales-primary-button" type="button">Generate Report</button>
        </article>
      </section>

      <script id="salesWorkspaceData" type="application/json">${serializedWorkspace}</script>
    </section>
  `;
}

function normalizeSalesWorkspace(workspace) {
  return {
    products: Array.isArray(workspace?.products) ? workspace.products.map((product) => ({
      ...product,
      product_id: Number(product.product_id || 0),
      selling_price: Number(product.selling_price || 0),
      stock_quantity: Number(product.stock_quantity || 0),
      reorder_level: Number(product.reorder_level || 0)
    })) : [],
    customers: Array.isArray(workspace?.customers) ? workspace.customers : [],
    salesHistory: Array.isArray(workspace?.salesHistory) ? workspace.salesHistory.map((sale) => ({
      ...sale,
      sale_id: Number(sale.sale_id || 0),
      total_amount: Number(sale.total_amount || 0),
      item_count: Number(sale.item_count || 0),
      discount: Number(sale.discount || 0)
    })) : [],
    report: workspace?.report || { sales_count: 0, sales_total: 0, total_discount: 0 }
  };
}

function renderSalesProductList(products) {
  if (!products.length) {
    return `<p class="empty-copy">No jewelry products matched your search.</p>`;
  }

  return `
    <div class="sales-product-table">
      <div class="sales-product-head">
        <span>Code</span>
        <span>Product Name</span>
        <span>Category</span>
        <span>Price (₱)</span>
        <span>Stock</span>
        <span>Add</span>
      </div>
      ${products.map((product) => `
        <div class="sales-product-row">
          <span>${escapeHtml(product.product_code)}</span>
          <span>
            <strong>${escapeHtml(product.product_name)}</strong>
            <small>${escapeHtml(product.material || "No material")} | ${escapeHtml(product.gemstone || "No gemstone")}</small>
          </span>
          <span>${escapeHtml(product.category_name)}</span>
          <span>${formatCurrency(product.selling_price)}</span>
          <span class="sales-stock-value ${product.stock_quantity <= product.reorder_level ? "low" : ""}">${formatNumber(product.stock_quantity)}</span>
          <span><button class="sales-add-item-button" type="button" data-action="add-to-cart" data-product-id="${product.product_id}">Add</button></span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderSalesCart(cart) {
  if (!cart.length) {
    return `<p class="empty-copy">No items in the current sale yet.</p>`;
  }

  return `
    <div class="sales-cart-grid">
      <div class="sales-cart-head">
        <span>#</span>
        <span>Product</span>
        <span>Unit Price (₱)</span>
        <span>Qty</span>
        <span>Subtotal (₱)</span>
        <span>Discount (₱)</span>
        <span>Total (₱)</span>
        <span>Action</span>
      </div>
      ${cart.map((item, index) => {
        const subtotal = item.quantity * item.selling_price;
        const total = Math.max(0, subtotal - item.discount);

        return `
          <div class="sales-cart-row">
            <span>${index + 1}</span>
            <span>
              <strong>${escapeHtml(item.product_name)}</strong>
              <small>${escapeHtml(item.product_code)}</small>
            </span>
            <span>${formatCurrency(item.selling_price)}</span>
            <span>
              <div class="sales-qty-control">
                <button type="button" data-action="cart-decrease" data-product-id="${item.product_id}">-</button>
                <strong>${formatNumber(item.quantity)}</strong>
                <button type="button" data-action="cart-increase" data-product-id="${item.product_id}">+</button>
              </div>
            </span>
            <span>${formatCurrency(subtotal)}</span>
            <span>
              <input class="sales-discount-input" type="number" min="0" step="0.01" value="${item.discount}" data-action="cart-discount" data-product-id="${item.product_id}" />
            </span>
            <span>${formatCurrency(total)}</span>
            <span><button class="sales-remove-button" type="button" data-action="cart-remove" data-product-id="${item.product_id}">Remove</button></span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderSalesTotals(cart, amountPaid) {
  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.selling_price), 0);
  const discount = cart.reduce((sum, item) => sum + item.discount, 0);
  const total = Math.max(0, subtotal - discount);
  const change = Math.max(0, Number(amountPaid || 0) - total);

  return {
    subtotal,
    discount,
    total,
    change,
    markup: `
      <div class="sales-total-line"><span>Subtotal</span><strong>${formatCurrency(subtotal)}</strong></div>
      <div class="sales-total-line"><span>Discount</span><strong>${formatCurrency(discount)}</strong></div>
      <div class="sales-total-line grand"><span>Grand Total</span><strong>${formatCurrency(total)}</strong></div>
    `
  };
}

function renderSalesHistory(history) {
  if (!history.length) {
    return `<p class="empty-copy">No sales history found yet.</p>`;
  }

  return `
    <div class="sales-history-grid-table">
      <div class="sales-history-head">
        <span>Invoice No.</span>
        <span>Date</span>
        <span>Customer</span>
        <span>Items</span>
        <span>Total (₱)</span>
        <span>Payment</span>
        <span>Status</span>
        <span>Action</span>
      </div>
      ${history.map((sale) => `
        <div class="sales-history-row">
          <span>${escapeHtml(sale.invoice_number)}</span>
          <span>${escapeHtml(new Date(sale.sale_date).toLocaleString("en-PH"))}</span>
          <span>${escapeHtml(sale.customer_name || "Walk-in Customer")}</span>
          <span>${formatNumber(sale.item_count)}</span>
          <span>${formatCurrency(sale.total_amount)}</span>
          <span>${escapeHtml(sale.payment_method || "Cash")}</span>
          <span>${escapeHtml(sale.payment_status || "Paid")}</span>
          <span><button class="sales-void-button" type="button" data-action="void-sale" data-sale-id="${sale.sale_id}">Void</button></span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderSalesReportSummary(report) {
  return `
    <div class="sales-report-lines">
      <div class="sales-total-line"><span>Total Sales Count</span><strong>${formatNumber(report.sales_count || 0)}</strong></div>
      <div class="sales-total-line"><span>Total Discounts</span><strong>${formatCurrency(report.total_discount || 0)}</strong></div>
      <div class="sales-total-line grand"><span>Sales Revenue</span><strong>${formatCurrency(report.sales_total || 0)}</strong></div>
    </div>
  `;
}

export function initializeSalesModule() {
  const dataElement = document.getElementById("salesWorkspaceData");
  const alertElement = document.getElementById("salesAlert");
  const productSearchInput = document.getElementById("salesProductSearchInput");
  const productSearchButton = document.getElementById("salesProductSearchButton");
  const productFilterSelect = document.getElementById("salesProductFilterSelect");
  const productListElement = document.getElementById("salesProductList");
  const cartTableElement = document.getElementById("salesCartTable");
  const totalsElement = document.getElementById("salesTotalsSummary");
  const customerSelect = document.getElementById("salesCustomerSelect");
  const customerEmail = document.getElementById("salesCustomerEmail");
  const customerPhone = document.getElementById("salesCustomerPhone");
  const customerToggle = document.getElementById("salesAddCustomerToggleButton");
  const customerForm = document.getElementById("salesCustomerForm");
  const amountPaidInput = document.getElementById("salesAmountPaidInput");
  const changeOutput = document.getElementById("salesChangeOutput");
  const noteInput = document.getElementById("salesNoteInput");
  const clearCartButton = document.getElementById("salesClearCartButton");
  const processPaymentButton = document.getElementById("salesProcessPaymentButton");
  const confirmButton = document.getElementById("salesConfirmButton");
  const printButton = document.getElementById("salesPrintButton");
  const cancelButton = document.getElementById("salesCancelButton");
  const historyElement = document.getElementById("salesHistoryTable");
  const reportElement = document.getElementById("salesReportSummary");
  const reportButton = document.getElementById("salesReportButton");
  const currentUser = getUser();

  if (!dataElement || !productListElement || !cartTableElement || !totalsElement) {
    return;
  }

  let workspace = {};

  try {
    workspace = normalizeSalesWorkspace(JSON.parse(dataElement.textContent || "{}"));
  } catch {
    workspace = normalizeSalesWorkspace({});
  }

  const state = {
    products: workspace.products,
    customers: workspace.customers,
    salesHistory: workspace.salesHistory,
    report: workspace.report,
    cart: [],
    searchTerm: "",
    filterValue: "all",
    amountPaid: 0,
    customerMode: "existing",
    isBusy: false,
    latestInvoice: ""
  };

  function setAlert(message, tone = "info") {
    if (!message) {
      alertElement.hidden = true;
      alertElement.textContent = "";
      alertElement.dataset.tone = "";
      return;
    }

    alertElement.hidden = false;
    alertElement.textContent = message;
    alertElement.dataset.tone = tone;
  }

  function setBusy(nextBusy) {
    state.isBusy = nextBusy;
    const controls = [
      productSearchInput,
      productSearchButton,
      productFilterSelect,
      customerSelect,
      customerToggle,
      amountPaidInput,
      noteInput,
      clearCartButton,
      processPaymentButton,
      confirmButton,
      printButton,
      cancelButton,
      reportButton
    ];

    controls.forEach((element) => {
      if (element) {
        element.disabled = nextBusy;
      }
    });

    if (customerForm) {
      Array.from(customerForm.elements).forEach((element) => {
        element.disabled = nextBusy;
      });
    }
  }

  function getFilteredProducts() {
    const query = String(state.searchTerm || "").trim().toLowerCase();

    return state.products.filter((product) => {
      const matchesQuery =
        !query ||
        product.product_name.toLowerCase().includes(query) ||
        product.product_code.toLowerCase().includes(query) ||
        product.category_name.toLowerCase().includes(query);
      const matchesFilter =
        state.filterValue === "all" ||
        (state.filterValue === "available" && product.stock_quantity > 0) ||
        (state.filterValue === "low-stock" && product.stock_quantity <= product.reorder_level);

      return matchesQuery && matchesFilter;
    });
  }

  function syncCustomerSelect() {
    customerSelect.innerHTML = [
      `<option value="">Walk-in Customer</option>`,
      ...state.customers.map((customer) => `<option value="${customer.customer_id}">${escapeHtml(customer.customer_name)}</option>`)
    ].join("");
  }

  function updateSelectedCustomerMeta() {
    const selectedId = Number(customerSelect.value || 0);
    const customer = state.customers.find((item) => Number(item.customer_id) === selectedId);
    customerEmail.textContent = customer?.email || "No email";
    customerPhone.textContent = customer?.phone || "No phone";
  }

  function renderAll() {
    productListElement.innerHTML = renderSalesProductList(getFilteredProducts());
    cartTableElement.innerHTML = renderSalesCart(state.cart);

    const totals = renderSalesTotals(state.cart, state.amountPaid);
    totalsElement.innerHTML = totals.markup;
    changeOutput.value = formatCurrency(totals.change);
    historyElement.innerHTML = renderSalesHistory(state.salesHistory);
    reportElement.innerHTML = renderSalesReportSummary(state.report);
    updateSelectedCustomerMeta();
  }

  function replaceWorkspace(nextWorkspace) {
    const normalized = normalizeSalesWorkspace(nextWorkspace);
    state.products = normalized.products;
    state.customers = normalized.customers;
    state.salesHistory = normalized.salesHistory;
    state.report = normalized.report;
    syncCustomerSelect();
    renderAll();
  }

  async function refreshWorkspace(message) {
    const result = await fetchSalesWorkspaceApi();
    replaceWorkspace(result);

    if (message) {
      setAlert(message, "success");
    }
  }

  function addToCart(productId) {
    const product = state.products.find((item) => item.product_id === Number(productId));

    if (!product) {
      return;
    }

    const existing = state.cart.find((item) => item.product_id === product.product_id);

    if (existing) {
      if (existing.quantity >= product.stock_quantity) {
        setAlert(`Only ${product.stock_quantity} stock is available for ${product.product_name}.`, "warning");
        return;
      }

      existing.quantity += 1;
    } else {
      if (product.stock_quantity <= 0) {
        setAlert(`${product.product_name} is out of stock.`, "warning");
        return;
      }

      state.cart.push({
        product_id: product.product_id,
        product_code: product.product_code,
        product_name: product.product_name,
        selling_price: Number(product.selling_price || 0),
        quantity: 1,
        discount: 0
      });
    }

    setAlert("");
    renderAll();
  }

  function getSelectedPaymentMethod() {
    const checked = document.querySelector("input[name='salesPaymentMethod']:checked");
    return checked?.value || "Cash";
  }

  function getSelectedCustomerPayload() {
    if (!customerForm.hidden) {
      const formData = new FormData(customerForm);
      const customerName = String(formData.get("customer_name") || "").trim();

      if (!customerName) {
        return null;
      }

      return {
        customer_name: customerName,
        phone: String(formData.get("phone") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        address: String(formData.get("address") || "").trim()
      };
    }

    const selectedId = Number(customerSelect.value || 0);
    const customer = state.customers.find((item) => Number(item.customer_id) === selectedId);
    return customer ? { customer_id: customer.customer_id } : { customer_name: "Walk-in Customer" };
  }

  syncCustomerSelect();
  renderAll();

  productSearchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      state.searchTerm = event.target.value;
      renderAll();
    }
  });

  productSearchButton?.addEventListener("click", () => {
    state.searchTerm = productSearchInput.value;
    renderAll();
  });

  productFilterSelect?.addEventListener("change", (event) => {
    state.filterValue = event.target.value;
    renderAll();
  });

  customerSelect?.addEventListener("change", () => {
    renderAll();
  });

  customerToggle?.addEventListener("click", () => {
    customerForm.hidden = !customerForm.hidden;
  });

  amountPaidInput?.addEventListener("input", (event) => {
    state.amountPaid = Number(event.target.value || 0);
    renderAll();
  });

  clearCartButton?.addEventListener("click", () => {
    state.cart = [];
    state.amountPaid = 0;
    amountPaidInput.value = 0;
    noteInput.value = "";
    setAlert("Current sale has been cleared.", "info");
    renderAll();
  });

  productListElement.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action='add-to-cart']");

    if (!button) {
      return;
    }

    addToCart(button.dataset.productId);
  });

  cartTableElement.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");

    if (!button) {
      return;
    }

    const productId = Number(button.dataset.productId || 0);
    const cartItem = state.cart.find((item) => item.product_id === productId);
    const product = state.products.find((item) => item.product_id === productId);

    if (!cartItem || !product) {
      return;
    }

    if (button.dataset.action === "cart-increase") {
      if (cartItem.quantity < product.stock_quantity) {
        cartItem.quantity += 1;
      } else {
        setAlert(`Only ${product.stock_quantity} stock is available for ${product.product_name}.`, "warning");
      }
    }

    if (button.dataset.action === "cart-decrease") {
      cartItem.quantity -= 1;
      if (cartItem.quantity <= 0) {
        state.cart = state.cart.filter((item) => item.product_id !== productId);
      }
    }

    if (button.dataset.action === "cart-remove") {
      state.cart = state.cart.filter((item) => item.product_id !== productId);
    }

    renderAll();
  });

  cartTableElement.addEventListener("input", (event) => {
    const input = event.target.closest("[data-action='cart-discount']");

    if (!input) {
      return;
    }

    const productId = Number(input.dataset.productId || 0);
    const cartItem = state.cart.find((item) => item.product_id === productId);

    if (!cartItem) {
      return;
    }

    const nextDiscount = Math.max(0, Number(input.value || 0));
    const lineSubtotal = cartItem.quantity * cartItem.selling_price;
    cartItem.discount = Math.min(nextDiscount, lineSubtotal);
    renderAll();
  });

  processPaymentButton?.addEventListener("click", () => {
    const totals = renderSalesTotals(state.cart, state.amountPaid);
    if (!state.cart.length) {
      setAlert("Add products to the cart before processing payment.", "warning");
      return;
    }

    if (state.amountPaid <= 0) {
      setAlert("Enter an amount paid before processing payment.", "warning");
      return;
    }

    setAlert(`Payment checked. Remaining balance: ${formatCurrency(Math.max(0, totals.total - state.amountPaid))}.`, "success");
  });

  confirmButton?.addEventListener("click", async () => {
    if (!state.cart.length) {
      setAlert("Add products to the cart before confirming the sale.", "warning");
      return;
    }

    const customerPayload = getSelectedCustomerPayload();

    if (customerForm && !customerForm.hidden && !customerPayload) {
      setAlert("Enter the new customer name or choose an existing customer.", "warning");
      return;
    }

    try {
      setBusy(true);
      const result = await checkoutSale({
        items: state.cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          discount: item.discount
        })),
        customer: customerPayload,
        payment_method: getSelectedPaymentMethod(),
        amount_paid: state.amountPaid,
        reference_number: document.getElementById("salesReferenceInput")?.value || "",
        note: noteInput.value,
        employee_id: currentUser?.id
      });

      state.latestInvoice = result.invoice_number || "";
      state.cart = [];
      state.amountPaid = 0;
      amountPaidInput.value = 0;
      noteInput.value = "";
      if (customerForm) {
        customerForm.reset();
        customerForm.hidden = true;
      }
      replaceWorkspace(result.workspace || {});
      setAlert(`Sale confirmed successfully. Receipt ${result.invoice_number} is ready. Inventory was reduced automatically.`, "success");
      window.dispatchEvent(new Event("inventory:refresh"));
    } catch (error) {
      setAlert(error.message || "Unable to confirm sale.", "warning");
    } finally {
      setBusy(false);
    }
  });

  printButton?.addEventListener("click", () => {
    if (!state.latestInvoice) {
      setAlert("Confirm a sale first before printing the receipt.", "warning");
      return;
    }

    window.print();
  });

  cancelButton?.addEventListener("click", () => {
    state.cart = [];
    state.amountPaid = 0;
    amountPaidInput.value = 0;
    noteInput.value = "";
    setAlert("Current sale was canceled before confirmation.", "info");
    renderAll();
  });

  historyElement.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action='void-sale']");

    if (!button) {
      return;
    }

    if (!["Admin", "Manager"].includes(String(currentUser?.role || ""))) {
      setAlert("Only an authorized admin or manager can void a sale.", "warning");
      return;
    }

    try {
      setBusy(true);
      const result = await voidSale(button.dataset.saleId, {
        employee_id: currentUser?.id,
        role: currentUser?.role
      });
      replaceWorkspace(result.workspace || {});
      setAlert("Sale voided successfully and inventory was restored.", "success");
      window.dispatchEvent(new Event("inventory:refresh"));
    } catch (error) {
      setAlert(error.message || "Unable to void sale.", "warning");
    } finally {
      setBusy(false);
    }
  });

  reportButton?.addEventListener("click", async () => {
    try {
      setBusy(true);
      await refreshWorkspace("Sales report refreshed successfully.");
    } catch (error) {
      setAlert(error.message || "Unable to refresh sales report.", "warning");
    } finally {
      setBusy(false);
    }
  });
}

export function renderEmptyModule(message) {
  return `
    <article class="module-card single-module-card empty-state">
      <h3>Module unavailable</h3>
      <p>${escapeHtml(message)}</p>
    </article>
  `;
}
