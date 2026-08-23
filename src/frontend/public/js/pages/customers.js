import { fetchDashboardData } from "../modules/dashboard-api.js";
import { renderCustomersModule, renderEmptyModule } from "../modules/module-renderer.js";
import { initializeProtectedPage } from "../modules/page-shell.js";

initializeProtectedPage();

const moduleContent = document.getElementById("moduleContent");

async function loadPage() {
  if (!moduleContent) {
    return;
  }

  moduleContent.innerHTML = renderEmptyModule("Loading customers module...");

  try {
    const result = await fetchDashboardData();
    moduleContent.innerHTML = renderCustomersModule(result.modules.customers);
  } catch (error) {
    moduleContent.innerHTML = renderEmptyModule(error.message || "Unable to load customers.");
  }
}

loadPage();
