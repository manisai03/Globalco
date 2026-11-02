import { useCallback, useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './theme';

function getInitialDark() {
  const stored = localStorage.getItem('theme');
  if (stored) return stored === 'dark';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(getInitialDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const toggle = useCallback(() => setDark((d) => !d), []);
  const value = useMemo(() => ({ dark, toggle }), [dark, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
