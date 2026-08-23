import { clearUser, requireUser } from "./session.js";

export function initializeProtectedPage() {
  const user = requireUser();

  if (!user) {
    return null;
  }

  const welcomeMessage = document.getElementById("welcomeMessage");
  const logoutButton = document.getElementById("logoutButton");

  if (welcomeMessage) {
    const name = user.name || user.username || "User";
    const role = user.role ? ` (${user.role})` : "";
    welcomeMessage.textContent = `Welcome, ${name}${role}`;
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      clearUser();
      window.location.replace("/login");
    });
  }

  return user;
}
