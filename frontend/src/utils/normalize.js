/** Strip spaces and fix common mobile keyboard issues on auth forms. */
export function normalizeEmail(email) {
  return email?.trim() ?? '';
}

export function normalizePhone(phone) {
  if (!phone?.trim()) return '';
  // Keep leading +, remove spaces, dashes, parentheses (common on mobile autofill)
  let cleaned = phone.trim().replace(/[\s().-]/g, '');
  if (cleaned.startsWith('+')) {
    return '+' + cleaned.slice(1).replace(/\D/g, '');
  }
  return cleaned.replace(/\D/g, '');
}

export function trimFormFields(form) {
  const out = {};
  for (const [key, value] of Object.entries(form)) {
    out[key] = typeof value === 'string' ? value.trim() : value;
  }
  return out;
}
