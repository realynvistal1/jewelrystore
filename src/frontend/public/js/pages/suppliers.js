import { fetchSuppliersWorkspace } from "../modules/suppliers-api.js";
import {
  initializeSuppliersModule,
  renderEmptyModule,
  renderSuppliersModule
} from "../modules/module-renderer.js";
import { initializeProtectedPage } from "../modules/page-shell.js";

initializeProtectedPage();

const moduleContent = document.getElementById("moduleContent");

async function loadPage() {
  if (!moduleContent) {
    return;
  }

  moduleContent.innerHTML = renderEmptyModule("Loading suppliers module...");

  try {
    const result = await fetchSuppliersWorkspace();
    moduleContent.innerHTML = renderSuppliersModule(result);
    initializeSuppliersModule();
  } catch (error) {
    moduleContent.innerHTML = renderEmptyModule(error.message || "Unable to load suppliers.");
  }
}

loadPage();
