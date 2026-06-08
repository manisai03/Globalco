const LEGACY_COMPANY_NAMES = new Set([
  'globalco technologies',
  'globalco',
  'globalco jobs',
  'our company',
]);

export function isLegacyCompanyName(name) {
  if (!name || !String(name).trim()) return true;
  return LEGACY_COMPANY_NAMES.has(String(name).trim().toLowerCase());
}

/** Prefer a real company from the form, then recruiter profile. Ignores legacy Globalco placeholders. */
export function resolveRecruiterCompany(user, formCompany) {
  const fromForm = formCompany?.trim();
  if (fromForm && !isLegacyCompanyName(fromForm)) return fromForm;

  const fromProfile = user?.companyName?.trim();
  if (fromProfile && !isLegacyCompanyName(fromProfile)) return fromProfile;

  return '';
}
