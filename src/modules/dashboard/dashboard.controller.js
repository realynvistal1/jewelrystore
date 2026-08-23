const { getDashboardData, getHealthStatus } = require("./dashboard.service");

async function health(req, res) {
  try {
    const result = await getHealthStatus();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Database connection failed.",
      error: error.message
    });
  }
}

async function dashboard(req, res) {
  try {
    const result = await getDashboardData();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Unable to load dashboard data.",
      error: error.message
    });
  }
}

module.exports = {
  dashboard,
  health
};
