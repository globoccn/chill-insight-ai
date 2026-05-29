export const AUTH_STORAGE_KEY = "cag_auth";
export const AUTH_USER_KEY = "cag_auth_user";

export const DEMO_LOGIN = "admin";
export const DEMO_PASSWORD = "ccn4u700";

export function isAuthenticated() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUTH_STORAGE_KEY) === "true";
}

export function loginDemo(username: string, password: string) {
  const ok = username.trim() === DEMO_LOGIN && password === DEMO_PASSWORD;
  if (!ok || typeof window === "undefined") return false;

  window.localStorage.setItem(AUTH_STORAGE_KEY, "true");
  window.localStorage.setItem(AUTH_USER_KEY, username.trim());
  window.dispatchEvent(new Event("cag-auth-change"));
  return true;
}

export function logoutDemo() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
  window.dispatchEvent(new Event("cag-auth-change"));
}
