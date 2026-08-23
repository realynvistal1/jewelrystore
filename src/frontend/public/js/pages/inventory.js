import { fetchInventoryData } from "../modules/inventory-api.js";
import {
  initializeInventoryModule,
  renderEmptyModule,
  renderInventoryModule
} from "../modules/module-renderer.js";
import { initializeProtectedPage } from "../modules/page-shell.js";

initializeProtectedPage();

const moduleContent = document.getElementById("moduleContent");

async function loadPage() {
  if (!moduleContent) {
    return;
  }

  moduleContent.innerHTML = renderEmptyModule("Loading inventory module...");

  try {
    const result = await fetchInventoryData();
    moduleContent.innerHTML = renderInventoryModule(result.items);
    initializeInventoryModule();
  } catch (error) {
    moduleContent.innerHTML = renderEmptyModule(error.message || "Unable to load inventory.");
  }
}

loadPage();
