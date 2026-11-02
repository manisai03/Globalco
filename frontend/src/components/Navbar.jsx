import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Briefcase, Moon, Sun, Bell, MessageSquare, Menu,
  Home, LayoutDashboard, User, LogOut, LogIn, UserPlus, Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuth } from '../context/auth';
import { useTheme } from '../context/theme';
import api, { unwrap } from '../services/api';
import { chatSocket } from '../services/chatSocket';
import { APP_NAME } from '../utils/appBranding';
import { COUNTS_CHANGED_EVENT } from '../utils/events';

function isNavActive(item, location) {
  const [path, query = ''] = item.to.split('?');
  const tab = new URLSearchParams(query).get('tab');
  const currentTab = new URLSearchParams(location.search).get('tab');
  if (tab) {
    const effectiveTab = currentTab || (path === '/dashboard' ? 'applications' : 'overview');
    return location.pathname === path && effectiveTab === tab;
  }
  if (item.activePath) {
    if (currentTab && item.activeTab) {
      return location.pathname === item.activePath && currentTab === item.activeTab;
    }
    return location.pathname === path && !currentTab;
  }
  return location.pathname === path;
}

function NavItem({ item, active, onClick }) {
  const { to, label, icon: Icon, badge } = item;
  return (
    <Link
      to={to}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span>{label}</span>
      {badge > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  );
}

function initials(name, email) {
  const source = (name || email || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [msgCount, setMsgCount] = useState(0);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    const fetchCounts = async () => {
      if (document.hidden) return;
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
    const interval = setInterval(fetchCounts, 30000);
    const offSocket = chatSocket.onMessage(() => fetchCounts());
    document.addEventListener('visibilitychange', fetchCounts);
    window.addEventListener(COUNTS_CHANGED_EVENT, fetchCounts);
    return () => {
      clearInterval(interval);
      offSocket();
      document.removeEventListener('visibilitychange', fetchCounts);
      window.removeEventListener(COUNTS_CHANGED_EVENT, fetchCounts);
    };
  }, [userId]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileOpen(false);
  };

  const profileHref = isAdmin ? '/admin?tab=profile' : '/dashboard?tab=profile';
  const navItems = [
    { to: '/', label: 'Home', icon: Home, show: true },
    { to: '/jobs', label: 'Jobs', icon: Briefcase, show: true },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: user && !isAdmin, activePath: '/dashboard', activeTab: 'applications' },
    { to: '/admin', label: 'Recruiter', icon: Shield, show: user && isAdmin, activePath: '/admin', activeTab: 'overview' },
    { to: isAdmin ? '/admin?tab=messages' : '/dashboard?tab=messages', label: 'Messages', icon: MessageSquare, show: !!user, badge: msgCount, activeTab: 'messages' },
    { to: '/notifications', label: 'Notifications', icon: Bell, show: !!user, badge: notifCount },
    { to: profileHref, label: 'Profile', icon: User, show: !!user, activeTab: 'profile' },
  ].filter((item) => item.show);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="border-b border-border/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-primary sm:text-xl">
            <Briefcase className="size-6 sm:size-7" />
            <span>{APP_NAME}</span>
          </Link>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
                  {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{dark ? 'Light mode' : 'Dark mode'}</TooltipContent>
            </Tooltip>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hidden h-10 gap-2 px-2 sm:inline-flex" aria-label="Account menu">
                    <Avatar className="size-8">
                      <AvatarImage src={user.profilePictureUrl} alt="" />
                      <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                        {initials(user.fullName, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-32 truncate text-sm font-medium">{user.fullName || user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <p className="truncate text-sm font-medium">{user.fullName || 'Account'}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate(isAdmin ? '/admin' : '/dashboard')}>
                    {isAdmin ? <Shield /> : <LayoutDashboard />}
                    {isAdmin ? 'Recruiter dashboard' : 'Dashboard'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate(profileHref)}>
                    <User />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
                    <LogOut />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Button variant="ghost" asChild>
                  <Link to="/login"><LogIn />Login</Link>
                </Button>
                <Button asChild>
                  <Link to="/register"><UserPlus />Register</Link>
                </Button>
              </div>
            )}

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2 text-primary">
                    <Briefcase className="size-5" />
                    {APP_NAME}
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4">
                  {navItems.map((item) => (
                    <NavItem
                      key={item.to}
                      item={item}
                      active={isNavActive(item, location)}
                      onClick={() => setMobileOpen(false)}
                    />
                  ))}
                </nav>
                <div className="mt-auto flex flex-col gap-2 border-t p-4">
                  {user ? (
                    <Button variant="outline" className="text-destructive hover:text-destructive" onClick={handleLogout}>
                      <LogOut />
                      Logout
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" asChild>
                        <Link to="/login" onClick={() => setMobileOpen(false)}><LogIn />Login</Link>
                      </Button>
                      <Button asChild>
                        <Link to="/register" onClick={() => setMobileOpen(false)}><UserPlus />Register</Link>
                      </Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <div className="hidden md:block">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <nav className="flex items-center gap-1 overflow-x-auto py-2">
            {navItems.map((item) => (
              <NavItem key={item.to} item={item} active={isNavActive(item, location)} />
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
