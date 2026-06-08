import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Briefcase, Moon, Sun, Bell, MessageSquare, Menu, X,
  Home, LayoutDashboard, User, LogOut, LogIn, UserPlus, Shield,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import api, { unwrap } from '../services/api';
import { chatSocket } from '../services/chatSocket';
import { APP_NAME } from '../utils/appBranding';

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [msgCount, setMsgCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchCounts = async () => {
      try {
        const [n, m] = await Promise.all([
          api.get('/api/notifications/unread-count'),
          api.get('/api/messages/unread-count'),
        ]);
        setNotifCount(unwrap(n).count);
        setMsgCount(unwrap(m).count);
      } catch { /* ignore */ }
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 10000);
    const onFocus = () => fetchCounts();
    const offSocket = chatSocket.onMessage(() => fetchCounts());
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(interval);
      offSocket();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileOpen(false);
  };

  const navItems = [
    { to: '/', label: 'Home', icon: Home, show: true },
    { to: '/jobs', label: 'Jobs', icon: Briefcase, show: true },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: user && !isAdmin, activePath: '/dashboard', activeTab: 'applications' },
    { to: '/admin', label: 'Admin', icon: Shield, show: user && isAdmin, activePath: '/admin', activeTab: 'overview' },
    { to: isAdmin ? '/admin?tab=messages' : '/dashboard?tab=messages', label: 'Messages', icon: MessageSquare, show: !!user, badge: msgCount, activeTab: 'messages' },
    { to: '/notifications', label: 'Notifications', icon: Bell, show: !!user, badge: notifCount },
    { to: isAdmin ? '/admin?tab=profile' : '/dashboard?tab=profile', label: 'Profile', icon: User, show: !!user, activeTab: 'profile' },
  ].filter((item) => item.show);

  const isNavActive = (item) => {
    const [path, query = ''] = item.to.split('?');
    const params = new URLSearchParams(query);
    const tab = params.get('tab');
    if (tab) {
      const currentTab = new URLSearchParams(location.search).get('tab') || (path === '/dashboard' ? 'applications' : 'overview');
      return location.pathname === path && currentTab === tab;
    }
    if (item.activePath) {
      const currentTab = new URLSearchParams(location.search).get('tab');
      if (currentTab && item.activeTab) {
        return location.pathname === item.activePath && currentTab === item.activeTab;
      }
      return location.pathname === path && !currentTab;
    }
    return location.pathname === path;
  };

  const NavItem = ({ to, label, icon: Icon, badge, onClick, ...item }) => {
    const active = isNavActive({ to, ...item });
    return (
    <NavLink
      to={to}
      onClick={onClick}
      className={`relative inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition ${
        active
          ? 'bg-primary-600 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100 hover:text-primary-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-primary-400'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
      {badge > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </NavLink>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      {/* Top row: logo + utilities */}
      <div className="border-b border-slate-100 dark:border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-primary-700 dark:text-primary-400 sm:text-xl">
            <Briefcase className="h-6 w-6 sm:h-7 sm:w-7" />
            <span>{APP_NAME}</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {user ? (
              <button
                onClick={handleLogout}
                className="hidden items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 sm:inline-flex dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <LogIn className="h-4 w-4" />
                  Login
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                >
                  <UserPlus className="h-4 w-4" />
                  Register
                </Link>
              </div>
            )}

            <button
              className="rounded-lg p-2 hover:bg-slate-100 md:hidden dark:hover:bg-slate-800"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Nav row: individual items in a horizontal row */}
      <div className="hidden md:block">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <nav className="flex items-center gap-1 overflow-x-auto py-2">
            {navItems.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile / tablet nav */}
      {mobileOpen && (
        <div className="border-t border-slate-100 px-4 py-3 md:hidden dark:border-slate-800">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavItem key={item.to} {...item} onClick={() => setMobileOpen(false)} />
            ))}
            {user ? (
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <LogIn className="h-4 w-4" />
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white"
                >
                  <UserPlus className="h-4 w-4" />
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
