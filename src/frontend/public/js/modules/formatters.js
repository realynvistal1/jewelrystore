export function formatCurrency(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

export function formatNumber(value) {
  return new Intl.NumberFormat("en-PH").format(Number(value || 0));
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function getBarWidth(value, maxValue) {
  const numericValue = Number(value || 0);
  const numericMax = Number(maxValue || 0);

  if (numericMax <= 0) {
    return 0;
  }

  return Math.max(8, Math.round((numericValue / numericMax) * 100));
}
