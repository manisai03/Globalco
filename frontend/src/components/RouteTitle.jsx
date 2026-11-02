import { matchPath, useLocation } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const TITLES = [
  ['/', null],
  ['/login', 'Sign in'],
  ['/register', 'Create account'],
  ['/forgot-password', 'Reset password'],
  ['/jobs', 'Browse jobs'],
  ['/jobs/:id', 'Job details'],
  ['/companies/:id', 'Company'],
  ['/profile', 'Profile'],
  ['/dashboard', 'My dashboard'],
  ['/admin', 'Recruiter dashboard'],
  ['/admin/jobs/new', 'Post a job'],
  ['/admin/jobs/:id/edit', 'Edit job'],
  ['/admin/applicants/:id', 'Application details'],
  ['/applications/:id', 'Application details'],
  ['/chat', 'Messages'],
  ['/resume-viewer', 'Resume'],
  ['/notifications', 'Notifications'],
  ['/notifications/:id', 'Notification'],
];

/** Default per-route document title; pages with richer titles (e.g. a job's name) override it. */
export default function RouteTitle() {
  const { pathname } = useLocation();
  const match = TITLES.find(([pattern]) => matchPath(pattern, pathname));
  useDocumentTitle(match ? match[1] : 'Page not found');
  return null;
}
