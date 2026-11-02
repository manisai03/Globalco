/**
 * Persists auth per tab in sessionStorage, so the token is gone when the tab closes. Falls back to localStorage
 * only if sessionStorage is blocked (some mobile browsers / private mode). New tabs get the session from an open
 * tab over a BroadcastChannel (see sessionSync.js), never from persistent storage.
 */
const PREFIX = 'jb_';
export const AUTH_TOKEN_STORAGE_KEY = `${PREFIX}token`;

function sessionStorageWorks() {
  try {
    const probe = `${PREFIX}probe`;
    sessionStorage.setItem(probe, '1');
    sessionStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

const store = sessionStorageWorks() ? sessionStorage : localStorage;

function read(key) {
  try {
    return store.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    store.setItem(PREFIX + key, value);
  } catch { /* storage full or blocked */ }
}

export const authStorage = {
  getToken() {
    return read('token');
  },

  setToken(token) {
    write('token', token);
  },

  getUser() {
    const raw = read('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setUser(user) {
    write('user', JSON.stringify(user));
  },

  clear() {
    try {
      store.removeItem(PREFIX + 'token');
      store.removeItem(PREFIX + 'user');
    } catch { /* ignore */ }
  },
};

/**
 * Earlier versions mirrored the session (and before that, an unprefixed token) into localStorage. Adopt it once
 * so nobody is signed out by the upgrade, then delete it so the token no longer outlives the browser session.
 */
export function migrateLegacyStorage() {
  if (store === localStorage) return;
  try {
    const token = localStorage.getItem(`${PREFIX}token`) || localStorage.getItem('token');
    const user = localStorage.getItem(`${PREFIX}user`) || localStorage.getItem('user');
    if (token && !authStorage.getToken()) {
      authStorage.setToken(token);
      if (user) write('user', user);
    }
    for (const key of [`${PREFIX}token`, `${PREFIX}user`, 'token', 'user']) localStorage.removeItem(key);
  } catch { /* ignore */ }
}

export function accountKey(user) {
  return user?.id != null && user?.role ? `${user.role}:${user.id}` : null;
}
