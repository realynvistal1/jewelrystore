import { fetchSalesWorkspace } from "../modules/sales-api.js";
import {
  initializeSalesModule,
  renderEmptyModule,
  renderSalesModule
} from "../modules/module-renderer.js";
import { initializeProtectedPage } from "../modules/page-shell.js";

initializeProtectedPage();

const moduleContent = document.getElementById("moduleContent");

async function loadPage() {
  if (!moduleContent) {
    return;
  }

  moduleContent.innerHTML = renderEmptyModule("Loading sales module...");

  try {
    const result = await fetchSalesWorkspace();
    moduleContent.innerHTML = renderSalesModule(result);
    initializeSalesModule();
  } catch (error) {
    moduleContent.innerHTML = renderEmptyModule(error.message || "Unable to load sales.");
  }
}

loadPage();
