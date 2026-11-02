import { describe, expect, it } from 'vitest';
import { getNotificationActionLink } from './notificationLinks';

const admin = { role: 'ROLE_ADMIN' };
const candidate = { role: 'ROLE_USER' };

describe('getNotificationActionLink', () => {
  it('sends recruiters to the applicant and candidates to their application', () => {
    expect(getNotificationActionLink({ type: 'NEW_APPLICATION', referenceId: 5 }, admin)).toBe('/admin/applicants/5');
    expect(getNotificationActionLink({ type: 'NEW_APPLICATION', referenceId: 5 }, candidate)).toBeNull();
    expect(getNotificationActionLink({ type: 'STATUS_UPDATE', referenceId: 9 }, candidate)).toBe('/applications/9');
  });

  it('routes messages by role', () => {
    expect(getNotificationActionLink({ type: 'NEW_MESSAGE' }, admin)).toBe('/admin?tab=messages');
    expect(getNotificationActionLink({ type: 'NEW_MESSAGE' }, candidate)).toBe('/chat');
  });

  it('links withdrawals to the applicant and job alerts to the new job', () => {
    expect(getNotificationActionLink({ type: 'APPLICATION_WITHDRAWN', referenceId: 3 }, admin)).toBe('/admin/applicants/3');
    expect(getNotificationActionLink({ type: 'JOB_ALERT', referenceId: 12 }, candidate)).toBe('/jobs/12');
  });

  it('handles missing notifications', () => {
    expect(getNotificationActionLink(null, candidate)).toBeNull();
  });
});
