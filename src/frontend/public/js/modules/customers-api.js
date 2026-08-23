async function parseResponse(response, fallbackMessage) {
  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.message || fallbackMessage);
  }

  return result;
}

export async function fetchCustomersWorkspace() {
  const response = await fetch("/api/customers/workspace");
  return parseResponse(response, "Failed to load customer workspace.");
}

export async function createCustomer(payload) {
  const response = await fetch("/api/customers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response, "Failed to add customer.");
}

export async function updateCustomer(customerId, payload) {
  const response = await fetch(`/api/customers/${encodeURIComponent(customerId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response, "Failed to update customer.");
}

export async function deleteCustomer(customerId) {
  const response = await fetch(`/api/customers/${encodeURIComponent(customerId)}`, {
    method: "DELETE"
  });

  return parseResponse(response, "Failed to delete customer.");
}
