export async function fetchDashboardData() {
  const response = await fetch("/api/dashboard");
  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.message || "Failed to load dashboard.");
  }

  return result;
}
