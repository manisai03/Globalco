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

export const authStorage = {
  getToken() {
    return read(primary, 'token') || read(fallback, 'token');
  },

  setToken(token) {
    write(fallback, 'token', token);
    write(primary, 'token', token);
  },

  getUser() {
    const raw = read(primary, 'user') || read(fallback, 'user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setUser(user) {
    const json = JSON.stringify(user);
    write(fallback, 'user', json);
    write(primary, 'user', json);
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

// One-time migration from old unprefixed keys + sync session auth for new tabs
export function migrateFromLocalStorage() {
  const legacyToken = localStorage.getItem('token');
  const legacyUser = localStorage.getItem('user');
  if (!authStorage.getToken() && legacyToken) {
    authStorage.setToken(legacyToken);
    if (legacyUser) {
      try {
        authStorage.setUser(JSON.parse(legacyUser));
      } catch { /* ignore corrupt legacy data */ }
    }
  }
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } catch { /* ignore */ }

  // New tabs cannot read sessionStorage — mirror active session into localStorage
  try {
    const sessionToken = primary.getItem(PREFIX + 'token');
    const sessionUser = primary.getItem(PREFIX + 'user');
    if (sessionToken) fallback.setItem(PREFIX + 'token', sessionToken);
    if (sessionUser) fallback.setItem(PREFIX + 'user', sessionUser);
  } catch { /* ignore */ }
}
