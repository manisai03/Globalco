import { defaultEducation, parseJsonField } from '../../utils/profileDefaults';
import { validateProfile, validateUrl, validateYear, validateYearRange } from '../../utils/validation';

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const EDUCATION_LEVELS = [
  { key: 'college', label: 'College' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'school', label: 'School' },
];

export const PERSONAL_FIELDS = [
  ['fullName', 'Full Name'], ['phone', 'Phone'], ['location', 'Location'],
  ['currentTitle', 'Current / Desired Title'], ['headline', 'Professional headline'], ['email', 'Email'],
];

export const RECRUITER_FIELDS = [
  ['fullName', 'Full Name'], ['email', 'Email'], ['phone', 'Phone'], ['location', 'Location'],
  ['recruiterTitle', 'Your Role / Title'], ['companyName', 'Company Name'],
  ['companyWebsite', 'Company Website'],
];

/** Fields each editable form owns; a form's draft only ever contains these, so saving it can't clobber others. */
export const PERSONAL_DRAFT_KEYS = ['fullName', 'phone', 'location', 'currentTitle', 'headline', 'bio', 'openToWork'];
export const RECRUITER_DRAFT_KEYS = [
  'fullName', 'phone', 'location', 'recruiterTitle', 'companyName', 'companyWebsite', 'companyDescription',
];

export function pick(source, keys) {
  return Object.fromEntries(keys.map((k) => [k, source?.[k] ?? (k === 'openToWork' ? false : '')]));
}

export function formatMonthYear(month, year) {
  if (!month && !year) return '';
  const m = month ? MONTH_NAMES[Number(month)] || month : '';
  return [m, year].filter(Boolean).join(' ');
}

/** Splits the API user into the saved state the page renders from. */
export function parseProfile(data) {
  return {
    profile: data,
    education: parseJsonField(data.educationProfile, defaultEducation()),
    internships: parseJsonField(data.internshipsProfile, []),
    employment: parseJsonField(data.employmentProfile, []).map((item) => ({
      ...item,
      isCurrent: item.isCurrent ?? !item.endYear,
    })),
  };
}

export function calcCompletion({ profile, education, internships, employment }) {
  const checks = [
    profile.fullName, profile.phone, profile.location, profile.email,
    profile.currentTitle, profile.skills,
    education.college?.collegeName, education.college?.course,
    internships.some((i) => i.companyName),
    employment.some((e) => e.companyName),
    profile.resumeUrl,
    profile.profilePictureUrl,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

/** @returns the first validation error, or null */
export function validateState({ profile, education, internships }, isAdmin) {
  const errors = validateProfile(profile, isAdmin);
  if (!isAdmin) {
    EDUCATION_LEVELS.forEach(({ key }) => {
      const e = education[key];
      if (!e) return;
      const err = validateYear(e.startYear, `${key} start year`)
        || validateYear(e.endYear, `${key} end year`)
        || validateYearRange(e.startYear, e.endYear);
      if (err) errors[`edu_${key}`] = err;
    });
    internships.forEach((item, i) => {
      const urlErr = validateUrl(item.projectUrl);
      if (urlErr) errors[`intern_${i}`] = urlErr;
      if (item.description?.length > 1000) errors[`intern_${i}`] = 'Internship description max 1000 characters';
    });
  }
  return Object.values(errors)[0] ?? null;
}

/** Saved state with one form's changes applied: `changes.profile` is merged, other slices replace. */
export function applyChanges(saved, changes) {
  return {
    ...saved,
    ...changes,
    profile: { ...saved.profile, ...(changes.profile || {}) },
  };
}

export function toUpdatePayload({ profile: p, education, internships, employment }) {
  return {
    fullName: p.fullName,
    phone: p.phone,
    location: p.location,
    bio: p.bio,
    skills: p.skills,
    currentTitle: p.currentTitle,
    headline: p.headline,
    openToWork: p.openToWork,
    companyName: p.companyName,
    companyWebsite: p.companyWebsite,
    companyDescription: p.companyDescription,
    recruiterTitle: p.recruiterTitle,
    educationProfile: JSON.stringify(education),
    internshipsProfile: JSON.stringify(internships),
    employmentProfile: JSON.stringify(employment),
  };
}
