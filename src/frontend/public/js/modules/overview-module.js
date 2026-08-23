import { escapeHtml, formatCurrency, formatNumber, getBarWidth } from "./formatters.js";

function renderBarGroup(title, items, labelKey, valueKey, formatter = formatNumber, cardClass = "") {
  if (!items || items.length === 0) {
    return `
      <article class="analytics-card ${cardClass}">
        <h3>${escapeHtml(title)}</h3>
        <p class="empty-copy">No analytics data available.</p>
      </article>
    `;
  }

  const maxValue = Math.max(...items.map((item) => Number(item[valueKey] || 0)), 0);

  return `
    <article class="analytics-card ${cardClass}">
      <div class="analytics-card-header">
        <h3>${escapeHtml(title)}</h3>
        <span class="analytics-chip">Bars</span>
      </div>
      <div class="bar-list">
        ${items
          .map((item) => {
            const width = getBarWidth(item[valueKey], maxValue);

            return `
              <div class="bar-row">
                <div class="bar-meta">
                  <strong>${escapeHtml(item[labelKey])}</strong>
                  <span>${escapeHtml(formatter(item[valueKey]))}</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill" style="width: ${width}%"></div>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    </article>
  `;
}

function renderHeroPanel(summary) {
  const heroItems = [
    ["Inventory Retail", summary.inventoryRetailValue, formatCurrency],
    ["Inventory Cost", summary.inventoryCostValue, formatCurrency],
    ["Units In Stock", summary.unitsInStock, formatNumber],
    ["Sales Records", summary.sales, formatNumber]
  ];
  const maxValue = Math.max(...heroItems.map(([, value]) => Number(value || 0)), 0);

  return `
    <article class="hero-card">
      <div class="hero-card-header">
        <div>
          <p class="hero-kicker">Trend</p>
          <h3>Store Performance</h3>
        </div>
        <span class="analytics-chip">Live</span>
      </div>
      <div class="hero-line-panel">
        <svg class="hero-line-svg" viewBox="0 0 320 140" role="img" aria-label="Performance trend line">
          <line class="hero-grid-line" x1="0" y1="118" x2="320" y2="118"></line>
          <line class="hero-grid-line" x1="0" y1="84" x2="320" y2="84"></line>
          <line class="hero-grid-line" x1="0" y1="50" x2="320" y2="50"></line>
          <path class="hero-line-shadow" d="M10,108 C42,88 64,64 92,58 C125,51 144,85 176,80 C206,74 228,38 258,42 C286,46 300,20 312,10 L312,118 L10,118 Z"></path>
          <path class="hero-line" d="M10,108 C42,88 64,64 92,58 C125,51 144,85 176,80 C206,74 228,38 258,42 C286,46 300,20 312,10"></path>
        </svg>
      </div>
      <div class="hero-stats">
        ${heroItems
          .map(([label, value, formatter]) => {
            const width = getBarWidth(value, maxValue);

            return `
              <div class="hero-stat-row">
                <div class="hero-stat-meta">
                  <strong>${escapeHtml(label)}</strong>
                  <span>${escapeHtml(formatter(value))}</span>
                </div>
                <div class="hero-stat-track">
                  <div class="hero-stat-fill" style="width: ${width}%"></div>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    </article>
  `;
}

function renderSnapshotCard(summary) {
  const items = [
    ["Customers", summary.customers],
    ["Suppliers", summary.suppliers],
    ["Sales", summary.sales],
    ["Payments", summary.payments],
    ["Low Stock", summary.lowStockItems]
  ];
  const maxValue = Math.max(...items.map(([, value]) => Number(value || 0)), 0);

  return `
    <article class="analytics-card analytics-list-card">
      <div class="analytics-card-header">
        <h3>Business Snapshot</h3>
        <span class="analytics-chip">Today</span>
      </div>
      <div class="snapshot-grid">
        ${items
          .map(([label, value]) => {
            const width = getBarWidth(value, maxValue);

            return `
              <div class="snapshot-item">
                <div class="snapshot-meta">
                  <strong>${escapeHtml(label)}</strong>
                  <span>${escapeHtml(formatNumber(value))}</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill" style="width: ${width}%"></div>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    </article>
  `;
}

function renderDonutCard(title, items, labelKey, valueKey) {
  if (!items || items.length === 0) {
    return `
      <article class="analytics-card analytics-donut-card">
        <h3>${escapeHtml(title)}</h3>
        <p class="empty-copy">No analytics data available.</p>
      </article>
    `;
  }

  const colors = ["#68aff0", "#2f7fc7", "#ffb85f", "#7fd4c8", "#9eaef7"];
  const total = items.reduce((sum, item) => sum + Number(item[valueKey] || 0), 0) || 1;
  let current = 0;
  const gradient = items
    .map((item, index) => {
      const value = Number(item[valueKey] || 0);
      const slice = (value / total) * 360;
      const start = current;
      const end = current + slice;
      current = end;
      return `${colors[index % colors.length]} ${start}deg ${end}deg`;
    })
    .join(", ");

  return `
    <article class="analytics-card analytics-donut-card">
      <div class="analytics-card-header">
        <h3>${escapeHtml(title)}</h3>
        <span class="analytics-chip">Split</span>
      </div>
      <div class="donut-layout">
        <div class="donut-chart" style="background: conic-gradient(${gradient});">
          <div class="donut-center">
            <div>
              <strong>${escapeHtml(formatNumber(total))}</strong>
              <span>Total</span>
            </div>
          </div>
        </div>
        <div class="donut-legend">
          ${items
            .map((item, index) => `
              <div class="donut-legend-item">
                <span class="donut-legend-swatch" style="background:${colors[index % colors.length]};"></span>
                <strong>${escapeHtml(item[labelKey])}</strong>
                <span>${escapeHtml(formatNumber(item[valueKey]))}</span>
              </div>
            `)
            .join("")}
        </div>
      </div>
    </article>
  `;
}

function renderSalesTable(salesRows) {
  if (!salesRows || salesRows.length === 0) {
    return `
      <article class="analytics-card analytics-table-card">
        <h3>Recent Sales</h3>
        <p class="empty-copy">No recent sales records found.</p>
      </article>
    `;
  }

  return `
    <article class="analytics-card analytics-table-card">
      <div class="analytics-card-header">
        <h3>Recent Sales</h3>
        <span class="analytics-chip">Table</span>
      </div>
      <div class="table-card">
        <div class="table-header">
          <span class="table-label">Invoice</span>
          <span class="table-label">Status</span>
          <span class="table-label">Amount</span>
        </div>
        ${salesRows
          .slice(0, 4)
          .map((row) => `
            <div class="table-row">
              <div class="table-cell">
                <span class="table-title">${escapeHtml(row.invoice_number)}</span>
                <span class="table-subtitle">${escapeHtml(row.customer_name || "Walk-in Customer")}</span>
              </div>
              <div class="table-cell">
                <span class="table-subtitle">${escapeHtml(row.payment_status || "Pending")}</span>
                <div class="table-meter">
                  <div class="table-meter-fill" style="width:${row.payment_status === "Paid" ? "100%" : "62%"}"></div>
                </div>
              </div>
              <div class="table-cell">
                <span class="table-title">${escapeHtml(formatCurrency(row.total_amount))}</span>
                <span class="table-subtitle">${escapeHtml(row.payment_method || "N/A")}</span>
              </div>
            </div>
          `)
          .join("")}
      </div>
    </article>
  `;
}

export function renderSummaryCards(summaryCards, summary) {
  if (!summaryCards) {
    return;
  }

  const cards = [
    ["Inventory Retail", formatCurrency(summary.inventoryRetailValue)],
    ["Growth", `${summary.lowStockItems > 0 ? Math.max(1, summary.inventoryItems - summary.lowStockItems) : summary.inventoryItems}%`],
    ["Units In Stock", formatNumber(summary.unitsInStock)],
    ["Customers", formatNumber(summary.customers)]
  ];

  summaryCards.innerHTML = cards
    .map(
      ([label, value]) => `
        <article class="summary-card">
          <p class="summary-label">${escapeHtml(label)}</p>
          <div class="summary-card-value">
            <h3>${escapeHtml(value)}</h3>
            <div class="summary-meter" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

export function renderHeroContent(heroPanel, summary) {
  if (!heroPanel) {
    return;
  }

  heroPanel.innerHTML = renderHeroPanel(summary);
}

export function renderOverviewAnalytics(overviewAnalytics, analytics, summary, modules) {
  if (!overviewAnalytics) {
    return;
  }

  overviewAnalytics.innerHTML = `
    ${renderBarGroup(
      "Stock Movement",
      analytics.stockStatusDistribution,
      "stock_status",
      "total_items",
      formatNumber,
      "analytics-list-card"
    )}
    ${renderBarGroup(
      "Top Inventory Value",
      analytics.topInventoryValueProducts,
      "product_name",
      "inventory_value",
      formatCurrency,
      "analytics-bar-card"
    )}
    ${renderSnapshotCard(summary)}
    ${renderDonutCard(
      "Inventory Share",
      analytics.stockStatusDistribution,
      "stock_status",
      "total_items"
    )}
    ${renderSalesTable(modules?.salesReport || [])}
  `;
}

export function renderOverviewLoading(summaryCards, overviewAnalytics) {
  if (summaryCards) {
    summaryCards.innerHTML = `
      <article class="summary-card placeholder-card">
        <h3>Loading dashboard...</h3>
        <p>Pulling your latest database modules.</p>
      </article>
    `;
  }

  if (overviewAnalytics) {
    overviewAnalytics.innerHTML = `
      <article class="analytics-card empty-state">
        <h3>Loading analytics...</h3>
        <p>Preparing your dashboard charts and bars.</p>
      </article>
    `;
  }
}

export function renderOverviewError(summaryCards, overviewAnalytics, message) {
  if (summaryCards) {
    summaryCards.innerHTML = `
      <article class="summary-card placeholder-card">
        <h3>Dashboard unavailable</h3>
        <p>${escapeHtml(message || "Unable to load dashboard data.")}</p>
      </article>
    `;
  }

  if (overviewAnalytics) {
    overviewAnalytics.innerHTML = `
      <article class="analytics-card empty-state">
        <h3>Analytics unavailable</h3>
        <p>${escapeHtml(message || "Unable to load analytics data.")}</p>
      </article>
    `;
  }
}
