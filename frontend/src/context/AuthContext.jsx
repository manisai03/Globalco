import { createContext, useContext, useState, useEffect } from 'react';
import api, { unwrap } from '../services/api';
import { authStorage, migrateFromLocalStorage } from '../services/authStorage';
import { chatSocket } from '../services/chatSocket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    migrateFromLocalStorage();
    return authStorage.getUser();
  });
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'ROLE_ADMIN';

  useEffect(() => {
    const token = authStorage.getToken();
    if (token) {
      api.get('/api/users/me')
        .then((res) => {
          const data = unwrap(res);
          setUser(data);
          authStorage.setUser(data);
          chatSocket.connect();
        })
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      chatSocket.connect();
    } else {
      chatSocket.disconnect();
    }
  }, [user]);

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email: email?.trim?.() ?? email, password });
    const data = unwrap(res);
    authStorage.setToken(data.token);
    authStorage.setUser(data.user);
    setUser(data.user);
    return data.user;
  };

  const register = async (formData) => {
    const res = await api.post('/api/auth/register', formData);
    return unwrap(res);
  };

  const logout = () => {
    chatSocket.disconnect();
    authStorage.clear();
    setUser(null);
  };

  const refreshUser = async () => {
    const res = await api.get('/api/users/me');
    const data = unwrap(res);
    setUser(data);
    authStorage.setUser(data);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
