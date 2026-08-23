const USER_STORAGE_KEY = "lustreUser";

export function saveUser(user) {
  sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function getUser() {
  const rawUser = sessionStorage.getItem(USER_STORAGE_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    sessionStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}

export function clearUser() {
  sessionStorage.removeItem(USER_STORAGE_KEY);
}

export function requireUser() {
  const user = getUser();

  if (!user) {
    window.location.replace("/login");
    return null;
  }

  return user;
}
