/**
 * Uses sessionStorage so each browser tab keeps its own login session.
 * This lets you test Admin in one tab and Candidate in another without overwriting each other.
 */
const storage = sessionStorage;

export const authStorage = {
  getToken() {
    return storage.getItem('token');
  },

  setToken(token) {
    storage.setItem('token', token);
  },

  getUser() {
    const raw = storage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  },

  setUser(user) {
    storage.setItem('user', JSON.stringify(user));
  },

  clear() {
    storage.removeItem('token');
    storage.removeItem('user');
  },
};

// One-time migration from old localStorage (shared across tabs)
export function migrateFromLocalStorage() {
  if (!authStorage.getToken() && localStorage.getItem('token')) {
    authStorage.setToken(localStorage.getItem('token'));
    const user = localStorage.getItem('user');
    if (user) authStorage.setUser(JSON.parse(user));
  }
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
