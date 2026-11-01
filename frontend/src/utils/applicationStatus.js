export const RECRUITER_STATUSES = ['PENDING', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'REJECTED', 'HIRED'];

export const WITHDRAWABLE_STATUSES = ['PENDING', 'SHORTLISTED', 'INTERVIEW_SCHEDULED'];

export const STATUS_BADGE_CLASSES = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  SHORTLISTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  INTERVIEW_SCHEDULED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  HIRED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  WITHDRAWN: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

export const STATUS_CHART_COLORS = {
  PENDING: '#f59e0b',
  SHORTLISTED: '#3b82f6',
  REJECTED: '#ef4444',
  INTERVIEW_SCHEDULED: '#8b5cf6',
  HIRED: '#10b981',
  WITHDRAWN: '#94a3b8',
};

export function formatStatus(status) {
  if (!status) return '';
  return status
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
