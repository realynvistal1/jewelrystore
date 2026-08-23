import { fetchDashboardData } from "../modules/dashboard-api.js";
import { renderEmptyModule, renderSalesModule } from "../modules/module-renderer.js";
import { initializeProtectedPage } from "../modules/page-shell.js";

initializeProtectedPage();

const moduleContent = document.getElementById("moduleContent");

async function loadPage() {
  if (!moduleContent) {
    return;
  }

  moduleContent.innerHTML = renderEmptyModule("Loading sales module...");

  try {
    const result = await fetchDashboardData();
    moduleContent.innerHTML = renderSalesModule(result.modules.salesReport);
  } catch (error) {
    moduleContent.innerHTML = renderEmptyModule(error.message || "Unable to load sales.");
  }
}

loadPage();
