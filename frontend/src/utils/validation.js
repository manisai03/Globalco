const PHONE_RE = /^[+]?[\d\s-]{10,15}$/;
const URL_RE = /^https?:\/\/.+/i;

export function validateEmail(email) {
  if (!email?.trim()) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address';
  return null;
}

export function validatePassword(password) {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return null;
}

export function validateRequired(value, fieldName) {
  if (!value?.trim()) return `${fieldName} is required`;
  return null;
}

export function validatePhone(phone) {
  if (!phone?.trim()) return null;
  if (!PHONE_RE.test(phone.trim())) return 'Enter a valid phone number (10–15 digits)';
  return null;
}

export function validateUrl(url) {
  if (!url?.trim()) return null;
  if (!URL_RE.test(url.trim())) return 'Enter a valid URL starting with http:// or https://';
  return null;
}

export function validateYear(year, fieldName) {
  if (!year) return null;
  const y = Number(year);
  const current = new Date().getFullYear();
  if (Number.isNaN(y) || y < 1970 || y > current + 5) return `${fieldName} must be between 1970 and ${current + 5}`;
  return null;
}

export function validateYearRange(startYear, endYear) {
  if (startYear && endYear && Number(startYear) > Number(endYear)) {
    return 'Start year cannot be after end year';
  }
  return null;
}

export function validateProfile(profile, isAdmin) {
  const errors = {};
  const req = (v, name) => { const e = validateRequired(v, name); if (e) errors[name] = e; };

  req(profile.fullName, 'Full Name');
  const phoneErr = validatePhone(profile.phone);
  if (phoneErr) errors.phone = phoneErr;

  if (isAdmin) {
    req(profile.companyName, 'Company Name');
    req(profile.recruiterTitle, 'Your Role / Title');
    const webErr = validateUrl(profile.companyWebsite);
    if (webErr) errors.companyWebsite = webErr;
  } else {
    if (profile.skills && profile.skills.split(',').filter((s) => s.trim()).length > 30) {
      errors.skills = 'Maximum 30 skills allowed';
    }
  }

  return errors;
}

export function validateRegister(form, isRecruiter) {
  const errors = {};
  const emailErr = validateEmail(form.email);
  if (emailErr) errors.email = emailErr;
  const passErr = validatePassword(form.password);
  if (passErr) errors.password = passErr;
  const nameErr = validateRequired(form.fullName, 'Full Name');
  if (nameErr) errors.fullName = nameErr;
  const phoneErr = validatePhone(form.phone);
  if (phoneErr) errors.phone = phoneErr;

  if (isRecruiter) {
    const cn = validateRequired(form.companyName, 'Company Name');
    if (cn) errors.companyName = cn;
    const rt = validateRequired(form.recruiterTitle, 'Your Role / Title');
    if (rt) errors.recruiterTitle = rt;
  }

  return errors;
}
