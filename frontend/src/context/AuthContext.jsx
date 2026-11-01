import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { unwrap } from '../services/api';
import { authStorage, migrateFromLocalStorage } from '../services/authStorage';
import { chatSocket } from '../services/chatSocket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    migrateFromLocalStorage();
    return authStorage.getUser();
  });
  const [loading, setLoading] = useState(() => Boolean(authStorage.getToken()));

  const isAdmin = user?.role === 'ROLE_ADMIN';

  const logout = useCallback(() => {
    chatSocket.disconnect();
    authStorage.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    if (!authStorage.getToken()) return;
    api.get('/api/users/me')
      .then((res) => {
        const data = unwrap(res);
        setUser(data);
        authStorage.setUser(data);
      })
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [logout]);

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
    return data.user;
  }, []);

  const register = useCallback(async (formData) => {
    const res = await api.post('/api/auth/register', formData);
    return unwrap(res);
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await api.get('/api/users/me');
    const data = unwrap(res);
    setUser(data);
    authStorage.setUser(data);
    return data;
  }, []);

  const value = useMemo(
    () => ({ user, loading, isAdmin, login, register, logout, refreshUser }),
    [user, loading, isAdmin, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
