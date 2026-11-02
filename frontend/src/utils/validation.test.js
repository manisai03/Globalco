import { describe, expect, it } from 'vitest';
import { validateEmail, validatePassword, validatePhone, validateRegister, validateUrl, validateYearRange } from './validation';

describe('field validators', () => {
  it('validates email', () => {
    expect(validateEmail('')).toBe('Email is required');
    expect(validateEmail('not-an-email')).toBe('Enter a valid email address');
    expect(validateEmail('a@b.co')).toBeNull();
  });

  it('requires 8-72 character passwords', () => {
    expect(validatePassword('1234567')).toMatch(/at least 8/);
    expect(validatePassword('12345678')).toBeNull();
    expect(validatePassword('x'.repeat(73))).toMatch(/at most 72/);
  });

  it('treats phone and URL as optional but well-formed', () => {
    expect(validatePhone('')).toBeNull();
    expect(validatePhone('12ab')).not.toBeNull();
    expect(validatePhone('+91 98765 43210')).toBeNull();
    expect(validateUrl('ftp://x')).not.toBeNull();
    expect(validateUrl('https://globalco.example')).toBeNull();
  });

  it('rejects inverted year ranges', () => {
    expect(validateYearRange('2024', '2020')).not.toBeNull();
    expect(validateYearRange('2020', '2024')).toBeNull();
  });
});

describe('validateRegister', () => {
  const base = { email: 'a@b.co', password: 'secret12', fullName: 'A B', phone: '' };

  it('needs company details only for recruiters', () => {
    expect(validateRegister(base, false)).toEqual({});
    expect(Object.keys(validateRegister(base, true)).sort()).toEqual(['companyName', 'recruiterTitle']);
  });

  it('checks the recruiter company website format', () => {
    const recruiter = { ...base, companyName: 'XPO', recruiterTitle: 'HR', companyWebsite: 'xpo.com' };
    expect(Object.keys(validateRegister(recruiter, true))).toEqual(['companyWebsite']);
  });
});
