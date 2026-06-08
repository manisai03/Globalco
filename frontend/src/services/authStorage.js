/**
 * Persists auth per tab. Falls back to localStorage if sessionStorage is blocked
 * (some mobile browsers / private mode).
 */
const primary = sessionStorage;
const fallback = localStorage;
const PREFIX = 'jb_';

function read(store, key) {
  try {
    return store.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

function write(store, key, value) {
  try {
    store.setItem(PREFIX + key, value);
    return true;
  } catch {
    return false;
  }
}

function activeStore() {
  if (read(primary, 'token') || read(fallback, 'token')) {
    return read(primary, 'token') ? primary : fallback;
  }
  return primary;
}

export const authStorage = {
  getToken() {
    return read(primary, 'token') || read(fallback, 'token');
  },

  setToken(token) {
    write(primary, 'token', token) || write(fallback, 'token', token);
  },

  getUser() {
    const raw = read(primary, 'user') || read(fallback, 'user');
    return raw ? JSON.parse(raw) : null;
  },

  setUser(user) {
    const json = JSON.stringify(user);
    write(primary, 'user', json) || write(fallback, 'user', json);
  },

  clear() {
    for (const store of [primary, fallback]) {
      try {
        store.removeItem(PREFIX + 'token');
        store.removeItem(PREFIX + 'user');
      } catch { /* ignore */ }
    }
    // Legacy keys
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch { /* ignore */ }
  },
};

// One-time migration from old unprefixed keys
export function migrateFromLocalStorage() {
  const legacyToken = localStorage.getItem('token');
  const legacyUser = localStorage.getItem('user');
  if (!authStorage.getToken() && legacyToken) {
    authStorage.setToken(legacyToken);
    if (legacyUser) authStorage.setUser(JSON.parse(legacyUser));
  }
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } catch { /* ignore */ }
}
