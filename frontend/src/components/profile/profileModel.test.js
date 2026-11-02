import { describe, expect, it } from 'vitest';
import {
  PERSONAL_DRAFT_KEYS, applyChanges, calcCompletion, parseProfile, pick, toUpdatePayload, validateState,
} from './profileModel';

const apiUser = {
  fullName: 'Asha Rao',
  email: 'asha@example.com',
  phone: '9876543210',
  location: 'Hyderabad',
  skills: 'Java, React',
  educationProfile: JSON.stringify({ college: { collegeName: 'JNTU', course: 'B.Tech' } }),
  internshipsProfile: '[]',
  employmentProfile: JSON.stringify([{ companyName: 'Acme', endYear: '' }]),
};

describe('profileModel', () => {
  it('parses the JSON sections and marks open-ended jobs as current', () => {
    const saved = parseProfile(apiUser);
    expect(saved.education.college.collegeName).toBe('JNTU');
    expect(saved.internships).toEqual([]);
    expect(saved.employment[0].isCurrent).toBe(true);
  });

  it('applies one section without touching the others', () => {
    const saved = parseProfile(apiUser);
    const next = applyChanges(saved, { profile: { skills: 'Go' } });

    expect(next.profile.skills).toBe('Go');
    expect(next.profile.fullName).toBe('Asha Rao');
    expect(next.education).toBe(saved.education);
    expect(next.employment).toBe(saved.employment);
  });

  it('a personal-info draft carries only personal fields', () => {
    const draft = pick({ ...apiUser, skills: 'should not be here' }, PERSONAL_DRAFT_KEYS);
    expect(Object.keys(draft)).toEqual(PERSONAL_DRAFT_KEYS);
    expect(draft.openToWork).toBe(false);
  });

  it('serialises the sections for the API', () => {
    const payload = toUpdatePayload(parseProfile(apiUser));
    expect(JSON.parse(payload.educationProfile).college.course).toBe('B.Tech');
    expect(payload.email).toBeUndefined();
  });

  it('reports the first validation problem', () => {
    const saved = parseProfile(apiUser);
    const bad = applyChanges(saved, { internships: [{ companyName: 'X', projectUrl: 'javascript:alert(1)' }] });
    expect(validateState(saved, false)).toBeNull();
    expect(validateState(bad, false)).toMatch(/url/i);
  });

  it('computes completion from the stored profile', () => {
    expect(calcCompletion(parseProfile(apiUser))).toBeGreaterThan(0);
    expect(calcCompletion(parseProfile(apiUser))).toBeLessThan(100);
  });
});
