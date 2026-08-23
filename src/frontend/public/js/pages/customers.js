import { fetchCustomersWorkspace } from "../modules/customers-api.js";
import {
  initializeCustomersModule,
  renderCustomersModule,
  renderEmptyModule
} from "../modules/module-renderer.js";
import { initializeProtectedPage } from "../modules/page-shell.js";

initializeProtectedPage();

const moduleContent = document.getElementById("moduleContent");

async function loadPage() {
  if (!moduleContent) {
    return;
  }

  moduleContent.innerHTML = renderEmptyModule("Loading customers module...");

  try {
    const result = await fetchCustomersWorkspace();
    moduleContent.innerHTML = renderCustomersModule(result);
    initializeCustomersModule();
  } catch (error) {
    moduleContent.innerHTML = renderEmptyModule(error.message || "Unable to load customers.");
  }
}

loadPage();
