import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { AuthContext, useAuth } from './auth';
import { ThemeContext, useTheme } from './theme';

function AuthProbe() {
  const { user } = useAuth();
  return <span>{user ? user.email : 'anonymous'}</span>;
}

function ThemeProbe() {
  const { dark } = useTheme();
  return <span>{dark ? 'dark' : 'light'}</span>;
}

describe('context hooks', () => {
  it('read the value supplied by the provider', () => {
    const html = renderToString(
      <AuthContext.Provider value={{ user: { email: 'a@b.co' } }}>
        <ThemeContext.Provider value={{ dark: true }}>
          <AuthProbe />
          <ThemeProbe />
        </ThemeContext.Provider>
      </AuthContext.Provider>
    );
    expect(html).toContain('a@b.co');
    expect(html).toContain('dark');
  });

  it('fail with a clear message instead of a null destructuring error', () => {
    expect(() => renderToString(<AuthProbe />)).toThrow('useAuth must be used inside <AuthProvider>');
    expect(() => renderToString(<ThemeProbe />)).toThrow('useTheme must be used inside <ThemeProvider>');
  });
});
