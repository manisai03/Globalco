import { useCallback, useEffect, useMemo, useState } from 'react';
import api, { unwrap } from '../services/api';
import { accountKey, authStorage, migrateLegacyStorage } from '../services/authStorage';
import { chatSocket } from '../services/chatSocket';
import {
  announceLogout, announceToken, listenForSessionMessages, requestSession, syncAvailable,
} from '../services/sessionSync';
import { AuthContext } from './auth';

function initialUser() {
  migrateLegacyStorage();
  if (!authStorage.getToken()) {
    authStorage.clear();
    return null;
  }
  return authStorage.getUser();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(initialUser);
  // Without a token we still wait briefly: another open tab may hand over its session.
  const [loading, setLoading] = useState(() => Boolean(authStorage.getToken()) || syncAvailable());

  const isAdmin = user?.role === 'ROLE_ADMIN';

  const endSession = useCallback(() => {
    chatSocket.disconnect();
    authStorage.clear();
    setUser(null);
  }, []);

  const logout = useCallback(() => {
    announceLogout(accountKey(authStorage.getUser()));
    endSession();
  }, [endSession]);

  const adoptSession = useCallback((token, sessionUser) => {
    authStorage.setToken(token);
    if (sessionUser) {
      authStorage.setUser(sessionUser);
      setUser(sessionUser);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authStorage.getToken()) {
        const handed = await requestSession();
        if (cancelled) return;
        if (!handed) {
          setLoading(false);
          return;
        }
        adoptSession(handed.token, handed.user);
      }
      try {
        const data = unwrap(await api.get('/api/users/me'));
        if (cancelled) return;
        setUser(data);
        authStorage.setUser(data);
      } catch (err) {
        // Keep the cached session on network errors or 5xx; only a rejected token ends it.
        if (!cancelled && err.response?.status === 401) endSession();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adoptSession, endSession]);

  useEffect(() => listenForSessionMessages({
    getSession: () => ({ token: authStorage.getToken(), user: authStorage.getUser() }),
    onLogout: (key) => {
      if (key && key === accountKey(authStorage.getUser())) endSession();
    },
    onToken: (token, key, sessionUser) => {
      const mine = accountKey(authStorage.getUser());
      // A signed-out tab follows a login elsewhere; a tab of the same account picks up its new token.
      if ((mine === null || mine === key) && token !== authStorage.getToken()) {
        adoptSession(token, sessionUser);
      }
    },
  }), [adoptSession, endSession]);

  useEffect(() => {
    if (user) {
      chatSocket.connect();
    } else {
      chatSocket.disconnect();
    }
  }, [user]);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/api/auth/login', { email: email?.trim?.() ?? email, password });
    const data = unwrap(res);
    authStorage.setToken(data.token);
    authStorage.setUser(data.user);
    setUser(data.user);
    announceToken(data.token, accountKey(data.user), data.user);
    return data.user;
  }, []);

  /** Stores a re-issued token (after a password change) and hands it to this account's other tabs. */
  const updateToken = useCallback((token) => {
    if (!token) return;
    authStorage.setToken(token);
    const current = authStorage.getUser();
    announceToken(token, accountKey(current), current);
    chatSocket.reconnect();
  }, []);

  const register = useCallback(async (formData) => {
    const res = await api.post('/api/auth/register', formData);
    return unwrap(res);
  }, []);

  /** Applies a user object the API already returned (e.g. from a profile save), without another request. */
  const updateUser = useCallback((data) => {
    if (!data) return;
    setUser(data);
    authStorage.setUser(data);
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await api.get('/api/users/me');
    const data = unwrap(res);
    updateUser(data);
    return data;
  }, [updateUser]);

  const value = useMemo(
    () => ({ user, loading, isAdmin, login, register, logout, refreshUser, updateUser, updateToken }),
    [user, loading, isAdmin, login, register, logout, refreshUser, updateUser, updateToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
