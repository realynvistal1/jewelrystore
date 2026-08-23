async function parseResponse(response, fallbackMessage) {
  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.message || fallbackMessage);
  }

  return result;
}

export async function fetchSuppliersWorkspace() {
  const response = await fetch("/api/suppliers/workspace");
  return parseResponse(response, "Failed to load supplier workspace.");
}

export async function createSupplier(payload) {
  const response = await fetch("/api/suppliers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response, "Failed to add supplier.");
}

export async function updateSupplier(supplierId, payload) {
  const response = await fetch(`/api/suppliers/${encodeURIComponent(supplierId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response, "Failed to update supplier.");
}

export async function deleteSupplier(supplierId) {
  const response = await fetch(`/api/suppliers/${encodeURIComponent(supplierId)}`, {
    method: "DELETE"
  });

  return parseResponse(response, "Failed to manage supplier.");
}

export async function createSupplierPurchase(payload) {
  const response = await fetch("/api/suppliers/purchases", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response, "Failed to create supplier purchase order.");
}

export async function receiveSupplierPurchase(purchaseId, payload) {
  const response = await fetch(`/api/suppliers/purchases/${encodeURIComponent(purchaseId)}/receive`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response, "Failed to receive delivered stock.");
}
