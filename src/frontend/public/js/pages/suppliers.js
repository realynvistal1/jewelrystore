import { fetchDashboardData } from "../modules/dashboard-api.js";
import { renderEmptyModule, renderSuppliersModule } from "../modules/module-renderer.js";
import { initializeProtectedPage } from "../modules/page-shell.js";

initializeProtectedPage();

const moduleContent = document.getElementById("moduleContent");

async function loadPage() {
  if (!moduleContent) {
    return;
  }

  moduleContent.innerHTML = renderEmptyModule("Loading suppliers module...");

  try {
    const result = await fetchDashboardData();
    moduleContent.innerHTML = renderSuppliersModule(result.modules.suppliers);
  } catch (error) {
    moduleContent.innerHTML = renderEmptyModule(error.message || "Unable to load suppliers.");
  }
}

loadPage();
