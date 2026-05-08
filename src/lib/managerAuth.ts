const PRIMARY_MANAGER_TOKEN_KEY = "manager_access_token";
const LEGACY_MANAGER_TOKEN_KEYS = ["xiaxiaobaidesu"];

function getWindowRef(target?: Window) {
  if (target) return target;
  if (typeof window === "undefined") return undefined;
  return window;
}

function readFromStorageArea(area: Storage, keys: string[]) {
  for (const key of keys) {
    const value = (area.getItem(key) || "").trim();
    if (value) return value;
  }
  return "";
}

export function readManagerToken(targetWindow?: Window) {
  const w = getWindowRef(targetWindow);
  if (!w) return "";
  try {
    const keys = [PRIMARY_MANAGER_TOKEN_KEY, ...LEGACY_MANAGER_TOKEN_KEYS];
    return (
      readFromStorageArea(w.localStorage, keys) ||
      readFromStorageArea(w.sessionStorage, keys)
    );
  } catch (err) {
    return "";
  }
}

export function hasManagerToken(targetWindow?: Window) {
  return !!readManagerToken(targetWindow);
}

export function saveManagerToken(token: string, remember: boolean, targetWindow?: Window) {
  const w = getWindowRef(targetWindow);
  if (!w) return;
  const value = String(token || "").trim();
  const allKeys = [PRIMARY_MANAGER_TOKEN_KEY, ...LEGACY_MANAGER_TOKEN_KEYS];
  try {
    if (remember) {
      allKeys.forEach((key) => w.sessionStorage.removeItem(key));
      allKeys.forEach((key) => w.localStorage.removeItem(key));
      if (value) w.localStorage.setItem(PRIMARY_MANAGER_TOKEN_KEY, value);
    } else {
      allKeys.forEach((key) => w.localStorage.removeItem(key));
      allKeys.forEach((key) => w.sessionStorage.removeItem(key));
      if (value) w.sessionStorage.setItem(PRIMARY_MANAGER_TOKEN_KEY, value);
    }
  } catch (err) {
    // ignore storage errors in private mode
  }
}

export function clearManagerToken(targetWindow?: Window) {
  const w = getWindowRef(targetWindow);
  if (!w) return;
  const allKeys = [PRIMARY_MANAGER_TOKEN_KEY, ...LEGACY_MANAGER_TOKEN_KEYS];
  try {
    allKeys.forEach((key) => w.localStorage.removeItem(key));
    allKeys.forEach((key) => w.sessionStorage.removeItem(key));
  } catch (err) {
    // ignore storage errors in private mode
  }
}

