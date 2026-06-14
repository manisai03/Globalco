import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, ChevronRight } from 'lucide-react';
import api, { unwrap } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { getNotificationActionLink } from '../utils/notificationLinks';

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await api.get('/api/notifications');
    setNotifications(unwrap(res));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const dismiss = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.delete(`/api/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success('Notification removed');
    } catch {
      toast.error('Failed to remove notification');
    }
  };

  const markAllRead = async () => {
    await api.patch('/api/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const openNotification = async (n) => {
    if (!n.read) {
      await api.patch(`/api/notifications/${n.id}/read`);
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
      );
    }
    navigate(`/notifications/${n.id}`);
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Notifications</h1>
        {notifications.some((n) => !n.read) && (
          <button onClick={markAllRead} className="text-sm text-primary-600 hover:underline">
            Mark all read
          </button>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {notifications.length === 0 ? (
          <p className="text-slate-500">No notifications yet.</p>
        ) : (
          notifications.map((n) => {
            const actionLink = getNotificationActionLink(n, user);
            return (
              <Link
                key={n.id}
                to={`/notifications/${n.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  openNotification(n);
                }}
                className={`relative block rounded-xl border p-4 transition hover:shadow-sm ${
                  n.read
                    ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                    : 'border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-900/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 pr-6">
                    <p className="font-medium">{n.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{n.message}</p>
                    <p className="mt-2 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
                    {actionLink && actionLink !== `/notifications/${n.id}` && (
                      <p className="mt-2 text-xs font-medium text-primary-600">Tap to view details →</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-start gap-2">
                    {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary-600" />}
                    {n.read ? (
                      <button
                        onClick={(e) => dismiss(e, n.id)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"
                        aria-label="Remove notification"
                        title="Remove notification"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : (
                      <ChevronRight className="mt-1 h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
