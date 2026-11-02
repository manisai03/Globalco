export const RECRUITER_STATUSES = ['PENDING', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'REJECTED', 'HIRED'];

export const WITHDRAWABLE_STATUSES = ['PENDING', 'SHORTLISTED', 'INTERVIEW_SCHEDULED'];

export const TERMINAL_STATUSES = ['HIRED', 'WITHDRAWN', 'JOB_REMOVED'];

// Must match STATUS_TRANSITIONS in application-service ApplicationService.
// INTERVIEW_SCHEDULED is only reachable by scheduling an interview.
export const STATUS_TRANSITIONS = {
  PENDING: ['SHORTLISTED', 'REJECTED'],
  SHORTLISTED: ['REJECTED', 'HIRED'],
  INTERVIEW_SCHEDULED: ['SHORTLISTED', 'REJECTED', 'HIRED'],
  REJECTED: ['SHORTLISTED'],
};

export const SCHEDULABLE_STATUSES = ['PENDING', 'SHORTLISTED', 'INTERVIEW_SCHEDULED'];

export const CONFIRM_STATUSES = ['REJECTED', 'HIRED'];

const STATUS_ACTIONS = {
  PENDING: 'Move to pending',
  SHORTLISTED: 'Shortlist',
  REJECTED: 'Reject',
  HIRED: 'Hire',
  INTERVIEW_SCHEDULED: 'Schedule interview',
};

export function allowedNextStatuses(status) {
  return STATUS_TRANSITIONS[status] || [];
}

export function statusActionLabel(status) {
  return STATUS_ACTIONS[status] || formatStatus(status);
}

export function matchScoreClass(score) {
  if (score >= 75) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  if (score >= 50) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
}

export const STATUS_BADGE_CLASSES = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  SHORTLISTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  INTERVIEW_SCHEDULED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  HIRED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  WITHDRAWN: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  JOB_REMOVED: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

export const STATUS_CHART_COLORS = {
  PENDING: '#f59e0b',
  SHORTLISTED: '#3b82f6',
  REJECTED: '#ef4444',
  INTERVIEW_SCHEDULED: '#8b5cf6',
  HIRED: '#10b981',
  WITHDRAWN: '#94a3b8',
  JOB_REMOVED: '#71717a',
};

const STATUS_LABELS = {
  JOB_REMOVED: 'Job Removed',
};

export function formatStatus(status) {
  if (!status) return '';
  if (STATUS_LABELS[status]) return STATUS_LABELS[status];
  return status
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
