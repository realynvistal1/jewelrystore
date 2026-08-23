import { escapeHtml, formatCurrency } from "./formatters.js";

function renderList(items, renderer, emptyText) {
  if (!items || items.length === 0) {
    return `<p class="empty-copy">${escapeHtml(emptyText)}</p>`;
  }

  return `<div class="table-like">${items.map(renderer).join("")}</div>`;
}

export function renderCustomersModule(items) {
  return `
    <article class="module-card single-module-card">
      <h3>Customers</h3>
      ${renderList(
        items,
        (item) => `
          <div class="data-row">
            <strong>${escapeHtml(item.customer_name)}</strong>
            <span>${escapeHtml(item.phone || "No phone")} | ${escapeHtml(item.email || "No email")}</span>
          </div>
        `,
        "No customers found."
      )}
    </article>
  `;
}

export function renderSuppliersModule(items) {
  return `
    <article class="module-card single-module-card">
      <h3>Suppliers</h3>
      ${renderList(
        items,
        (item) => `
          <div class="data-row">
            <strong>${escapeHtml(item.supplier_name)}</strong>
            <span>${escapeHtml(item.contact_person || "No contact person")} | ${escapeHtml(item.phone || "No phone")}</span>
          </div>
        `,
        "No suppliers found."
      )}
    </article>
  `;
}

export function renderInventoryModule(items) {
  return `
    <article class="module-card single-module-card">
      <h3>Inventory View</h3>
      ${renderList(
        items,
        (item) => `
          <div class="data-row">
            <strong>${escapeHtml(item.product_code)} - ${escapeHtml(item.product_name)}</strong>
            <span>${escapeHtml(item.category_name)} | ${escapeHtml(item.stock_status)} | Stock: ${escapeHtml(item.stock_quantity)} | Reorder: ${escapeHtml(item.reorder_level)} | ${formatCurrency(item.selling_price)}</span>
            <span>${escapeHtml(item.material || "No material")} | ${escapeHtml(item.gemstone || "No gemstone")}</span>
          </div>
        `,
        "No inventory rows found."
      )}
    </article>
  `;
}

export function renderSalesModule(items) {
  return `
    <article class="module-card single-module-card">
      <h3>Sales Records</h3>
      ${renderList(
        items,
        (item) => `
          <div class="data-row">
            <strong>${escapeHtml(item.invoice_number)} - ${escapeHtml(item.customer_name || "Walk-in Customer")}</strong>
            <span>${escapeHtml(item.cashier)} | ${escapeHtml(item.payment_status)} | ${formatCurrency(item.total_amount)}</span>
          </div>
        `,
        "No sales records found yet."
      )}
    </article>
  `;
}

export function renderEmptyModule(message) {
  return `
    <article class="module-card single-module-card empty-state">
      <h3>Module unavailable</h3>
      <p>${escapeHtml(message)}</p>
    </article>
  `;
}
