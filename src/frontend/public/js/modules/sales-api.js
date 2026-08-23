async function parseResponse(response, fallbackMessage) {
  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.message || fallbackMessage);
  }

  return result;
}

export async function fetchSalesWorkspace() {
  const response = await fetch("/api/sales/workspace");
  return parseResponse(response, "Failed to load sales workspace.");
}

export async function checkoutSale(payload) {
  const response = await fetch("/api/sales/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response, "Failed to process sale.");
}

export async function voidSale(saleId, payload) {
  const response = await fetch(`/api/sales/${encodeURIComponent(saleId)}/void`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response, "Failed to void sale.");
}
