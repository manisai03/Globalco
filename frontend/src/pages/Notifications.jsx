import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ChevronRight, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import api, { unwrap } from '../services/api';
import { useAuth } from '../context/AuthContext';
import EmptyState from '../components/common/EmptyState';
import { getNotificationActionLink } from '../utils/notificationLinks';

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get('/api/notifications')
      .then((res) => setNotifications(unwrap(res) || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const dismiss = async (id) => {
    try {
      await api.delete(`/api/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success('Notification removed');
    } catch {
      toast.error('Failed to remove notification');
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/api/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      toast.error('Failed to mark notifications as read');
    }
  };

  const openNotification = (n) => {
    if (!n.read) {
      api.patch(`/api/notifications/${n.id}/read`).catch(() => {});
      setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)));
    }
    navigate(`/notifications/${n.id}`);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          {!loading && unreadCount > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck /> Mark all read
          </Button>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {loading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}

        {!loading && error && (
          <EmptyState icon={Bell} title="Couldn't load notifications" description="Please check your connection and try again." actionLabel="Retry" onAction={() => window.location.reload()} />
        )}

        {!loading && !error && notifications.length === 0 && (
          <EmptyState icon={Bell} title="You're all caught up" description="Updates about your applications and messages will appear here." />
        )}

        {!loading && notifications.map((n) => {
          const actionLink = getNotificationActionLink(n, user);
          return (
            <div
              key={n.id}
              className={cn(
                'group relative flex items-start gap-3 rounded-xl border p-4 transition hover:shadow-sm',
                n.read ? 'bg-card' : 'border-primary/30 bg-accent'
              )}
            >
              <button
                type="button"
                onClick={() => openNotification(n)}
                className="min-w-0 flex-1 text-left outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50"
              >
                <p className="font-medium">{n.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
                {actionLink && actionLink !== `/notifications/${n.id}` && (
                  <p className="mt-2 text-xs font-medium text-primary">Tap to view details →</p>
                )}
              </button>
              <div className="relative z-10 flex shrink-0 items-start gap-2">
                {!n.read && <span className="mt-1.5 size-2 rounded-full bg-primary" aria-label="Unread" />}
                {n.read ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => dismiss(n.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Remove notification"
                      >
                        <X />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove</TooltipContent>
                  </Tooltip>
                ) : (
                  <ChevronRight className="mt-1 size-4 text-muted-foreground" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
