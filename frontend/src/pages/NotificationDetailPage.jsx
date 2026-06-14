import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import api, { unwrap } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { getNotificationActionLabel, getNotificationActionLink } from '../utils/notificationLinks';

export default function NotificationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/notifications')
      .then((res) => {
        const list = unwrap(res);
        const found = list.find((n) => String(n.id) === String(id));
        setNotification(found || null);
        if (found && !found.read) {
          api.patch(`/api/notifications/${found.id}/read`).catch(() => {});
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const isAdmin = user?.role === 'ROLE_ADMIN';
  const actionLink = notification ? getNotificationActionLink(notification, user) : null;
  const actionLabel = notification ? getNotificationActionLabel(notification.type, isAdmin) : null;

  if (loading) {
    return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
  }

  if (!notification) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link to="/notifications" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary-600">
          <ArrowLeft className="h-4 w-4" /> Back to Notifications
        </Link>
        <p className="text-slate-500">Notification not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link
        to="/notifications"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary-600 dark:text-slate-400"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Notifications
      </Link>

      <article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold">{notification.title}</h1>
          {!notification.read && (
            <span className="shrink-0 rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
              New
            </span>
          )}
        </div>
        <p className="mt-4 whitespace-pre-wrap text-slate-600 dark:text-slate-300">{notification.message}</p>
        <p className="mt-4 text-sm text-slate-400">{new Date(notification.createdAt).toLocaleString()}</p>

        {actionLink && actionLink !== `/notifications/${notification.id}` && (
          <button
            type="button"
            onClick={() => navigate(actionLink)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            {actionLabel}
            <ExternalLink className="h-4 w-4" />
          </button>
        )}
      </article>
    </div>
  );
}
