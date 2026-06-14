export function getNotificationActionLink(notification, user) {
  if (!notification) return null;
  const { type, referenceId } = notification;
  const isAdmin = user?.role === 'ROLE_ADMIN';

  switch (type) {
    case 'NEW_APPLICATION':
      return isAdmin && referenceId ? `/admin/applicants/${referenceId}` : null;
    case 'APPLICATION_SUBMITTED':
    case 'STATUS_UPDATE':
      return referenceId ? `/applications/${referenceId}` : null;
    case 'INTERVIEW_SCHEDULED':
      return isAdmin ? '/admin?tab=applicants' : '/dashboard?tab=interviews';
    case 'JOB_POSTED':
      return referenceId ? (isAdmin ? `/admin/jobs/${referenceId}/edit` : `/jobs/${referenceId}`) : null;
    case 'NEW_MESSAGE':
      return isAdmin ? '/admin?tab=messages' : '/chat';
    default:
      return referenceId ? `/notifications/${notification.id}` : null;
  }
}

export function getNotificationActionLabel(type, isAdmin) {
  switch (type) {
    case 'NEW_APPLICATION':
      return 'View application';
    case 'APPLICATION_SUBMITTED':
    case 'STATUS_UPDATE':
      return 'View application';
    case 'INTERVIEW_SCHEDULED':
      return isAdmin ? 'View applicants' : 'View dashboard';
    case 'JOB_POSTED':
      return isAdmin ? 'Edit job' : 'View job';
    case 'NEW_MESSAGE':
      return 'Open messages';
    default:
      return 'View details';
  }
}
