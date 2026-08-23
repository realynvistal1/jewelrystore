import { fetchDashboardData } from "../modules/dashboard-api.js";
import { renderEmptyModule, renderInventoryModule } from "../modules/module-renderer.js";
import { initializeProtectedPage } from "../modules/page-shell.js";

initializeProtectedPage();

const moduleContent = document.getElementById("moduleContent");

async function loadPage() {
  if (!moduleContent) {
    return;
  }

  moduleContent.innerHTML = renderEmptyModule("Loading inventory module...");

  try {
    const result = await fetchDashboardData();
    moduleContent.innerHTML = renderInventoryModule(result.modules.inventory);
  } catch (error) {
    moduleContent.innerHTML = renderEmptyModule(error.message || "Unable to load inventory.");
  }
}

loadPage();
