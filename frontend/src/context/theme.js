import { createContext, useContext } from 'react';

// Kept apart from ThemeProvider so hot reloads of the provider never create a second context object.
export const ThemeContext = createContext(null);

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>');
  return value;
}
