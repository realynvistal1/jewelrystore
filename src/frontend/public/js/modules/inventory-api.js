async function parseResponse(response, fallbackMessage) {
  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.message || fallbackMessage);
  }

  return result;
}

export async function fetchInventoryData() {
  const response = await fetch("/api/inventory");
  return parseResponse(response, "Failed to load inventory.");
}

export async function createInventoryProduct(payload) {
  const response = await fetch("/api/inventory", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response, "Failed to create product.");
}

export async function updateInventoryProduct(productCode, payload) {
  const response = await fetch(`/api/inventory/${encodeURIComponent(productCode)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response, "Failed to update product.");
}

export async function applyInventoryAction(productCode, payload) {
  const response = await fetch(`/api/inventory/${encodeURIComponent(productCode)}/actions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response, "Failed to apply inventory action.");
}
