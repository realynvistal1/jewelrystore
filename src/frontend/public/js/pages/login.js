import { submitLogin } from "../modules/auth-module.js";
import { saveUser } from "../modules/session.js";

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const forgotPasswordButton = document.getElementById("forgotPasswordButton");

if (loginForm && loginMessage) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const { ok, result } = await submitLogin(loginForm, loginMessage);

      if (!ok) {
        return;
      }

      saveUser(result.user);
      loginForm.reset();
      window.location.assign("/dashboard");
    } catch (error) {
      loginMessage.textContent = "Unable to reach the server right now.";
      loginMessage.className = "login-message error";
    }
  });
}

if (forgotPasswordButton && loginMessage) {
  forgotPasswordButton.addEventListener("click", () => {
    loginMessage.textContent = "Please contact the administrator to reset your password.";
    loginMessage.className = "login-message";
  });
}
