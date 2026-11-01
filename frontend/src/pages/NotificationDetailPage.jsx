import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bell, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import api, { unwrap } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { getNotificationActionLabel, getNotificationActionLink } from '../utils/notificationLinks';

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2 text-muted-foreground">
      <Link to="/notifications"><ArrowLeft /> Back to Notifications</Link>
    </Button>
  );
}

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
      .catch(() => setNotification(null))
      .finally(() => setLoading(false));
  }, [id]);

  const isAdmin = user?.role === 'ROLE_ADMIN';
  const actionLink = notification ? getNotificationActionLink(notification, user) : null;
  const actionLabel = notification ? getNotificationActionLabel(notification.type, isAdmin) : null;

  if (loading) return <LoadingSpinner fullScreen />;

  if (!notification) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <BackLink />
        <EmptyState icon={Bell} title="Notification not found" description="It may have been removed." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <BackLink />
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <CardTitle className="text-2xl font-bold">{notification.title}</CardTitle>
          {!notification.read && <Badge className="bg-accent text-accent-foreground">New</Badge>}
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-muted-foreground">{notification.message}</p>
          <p className="mt-4 text-sm text-muted-foreground">{new Date(notification.createdAt).toLocaleString()}</p>
        </CardContent>
        {actionLink && actionLink !== `/notifications/${notification.id}` && (
          <CardFooter>
            <Button onClick={() => navigate(actionLink)}>
              {actionLabel}
              <ExternalLink />
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
