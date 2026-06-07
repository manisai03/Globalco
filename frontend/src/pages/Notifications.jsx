import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api, { unwrap } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await api.get('/api/notifications');
    setNotifications(unwrap(res));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await api.patch(`/api/notifications/${id}/read`);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const dismiss = async (e, id) => {
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
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.read && markRead(n.id)}
              className={`relative rounded-xl border p-4 transition ${
                n.read
                  ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                  : 'cursor-pointer border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-900/20'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 pr-6">
                  <p className="font-medium">{n.title}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{n.message}</p>
                  <p className="mt-2 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex shrink-0 items-start gap-2">
                  {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary-600" />}
                  {n.read && (
                    <button
                      onClick={(e) => dismiss(e, n.id)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"
                      aria-label="Remove notification"
                      title="Remove notification"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
