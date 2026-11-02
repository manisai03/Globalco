import { createContext, useContext } from 'react';

// Kept apart from AuthProvider so hot reloads of the provider never create a second context object.
export const AuthContext = createContext(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
