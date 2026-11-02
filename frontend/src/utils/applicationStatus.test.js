import { describe, expect, it } from 'vitest';
import {
  formatStatus,
  RECRUITER_STATUSES,
  STATUS_BADGE_CLASSES,
  STATUS_CHART_COLORS,
  WITHDRAWABLE_STATUSES,
} from './applicationStatus';

describe('formatStatus', () => {
  it('title-cases backend statuses', () => {
    expect(formatStatus('INTERVIEW_SCHEDULED')).toBe('Interview Scheduled');
    expect(formatStatus('PENDING')).toBe('Pending');
  });

  it('uses the explicit label for JOB_REMOVED', () => {
    expect(formatStatus('JOB_REMOVED')).toBe('Job Removed');
  });

  it('returns an empty string for missing values', () => {
    expect(formatStatus(null)).toBe('');
    expect(formatStatus(undefined)).toBe('');
  });
});

describe('status tables', () => {
  const allStatuses = [...RECRUITER_STATUSES, 'WITHDRAWN', 'JOB_REMOVED'];

  it('styles and colours every status the backend can return', () => {
    for (const status of allStatuses) {
      expect(STATUS_BADGE_CLASSES[status], status).toBeTruthy();
      expect(STATUS_CHART_COLORS[status], status).toBeTruthy();
    }
  });

  it('never lets candidates withdraw closed applications', () => {
    expect(WITHDRAWABLE_STATUSES).not.toContain('JOB_REMOVED');
    expect(WITHDRAWABLE_STATUSES).not.toContain('HIRED');
    expect(WITHDRAWABLE_STATUSES).not.toContain('REJECTED');
  });

  it('does not let recruiters set JOB_REMOVED by hand', () => {
    expect(RECRUITER_STATUSES).not.toContain('JOB_REMOVED');
  });
});
