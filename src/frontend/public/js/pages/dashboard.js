import { fetchDashboardData } from "../modules/dashboard-api.js";
import { renderHeroContent, renderOverviewAnalytics, renderOverviewError, renderOverviewLoading, renderSummaryCards } from "../modules/overview-module.js";
import { initializeProtectedPage } from "../modules/page-shell.js";

initializeProtectedPage();

const heroPanel = document.getElementById("heroPanel");
const summaryCards = document.getElementById("summaryCards");
const overviewAnalytics = document.getElementById("overviewAnalytics");

async function loadPage() {
  renderOverviewLoading(summaryCards, overviewAnalytics);

  try {
    const result = await fetchDashboardData();
    renderHeroContent(heroPanel, result.summary);
    renderSummaryCards(summaryCards, result.summary);
    renderOverviewAnalytics(overviewAnalytics, result.analytics, result.summary, result.modules);
  } catch (error) {
    renderOverviewError(
      summaryCards,
      overviewAnalytics,
      error.message || "Unable to load dashboard data."
    );
  }
}

loadPage();
