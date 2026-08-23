export function showDashboardLayout(elements, user) {
  document.body.classList.remove("auth-mode");
  document.body.classList.add("dashboard-mode");

  if (elements.loginScreen) {
    elements.loginScreen.hidden = true;
  }

  if (elements.dashboardApp) {
    elements.dashboardApp.hidden = false;
  }

  if (elements.welcomeMessage) {
    const name = user?.name || user?.username || "User";
    const role = user?.role ? ` (${user.role})` : "";
    elements.welcomeMessage.textContent = `Welcome, ${name}${role}`;
  }
}

export function showLoginLayout(elements) {
  document.body.classList.remove("dashboard-mode");
  document.body.classList.add("auth-mode");

  if (elements.loginScreen) {
    elements.loginScreen.hidden = false;
  }

  if (elements.dashboardApp) {
    elements.dashboardApp.hidden = true;
  }

  if (elements.summaryCards) {
    elements.summaryCards.innerHTML = "";
  }

  if (elements.dashboardModules) {
    elements.dashboardModules.innerHTML = "";
  }

  if (elements.overviewAnalytics) {
    elements.overviewAnalytics.innerHTML = "";
  }

  if (elements.welcomeMessage) {
    elements.welcomeMessage.textContent = "Signed out";
  }

  if (elements.loginMessage) {
    elements.loginMessage.textContent = "";
    elements.loginMessage.className = "login-message";
  }
}

export async function submitLogin(loginForm, loginMessage) {
  const formData = new FormData(loginForm);
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");

  loginMessage.textContent = "Signing you in...";
  loginMessage.className = "login-message";

  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  });

  const result = await response.json();

  loginMessage.textContent = result.message;
  loginMessage.className = response.ok
    ? "login-message success"
    : "login-message error";

  return {
    ok: response.ok,
    result
  };
}
