const lakhs = (n) => `₹${Number((Number(n) / 100000).toFixed(1))}L`;

export function formatSalaryShort(min, max) {
  if (!min && !max) return 'Competitive';
  if (min && max) return `${lakhs(min)} – ${lakhs(max)}`;
  return max ? `Up to ${lakhs(max)}` : `From ${lakhs(min)}`;
}

export function formatSalary(min, max) {
  if (!min && !max) return 'Not disclosed';
  return `${formatSalaryShort(min, max)} per year`;
}

export function pluralize(count, singular, plural = `${singular}s`) {
  const n = Number(count) || 0;
  return `${n} ${n === 1 ? singular : plural}`;
}

export function daysAgo(dateStr) {
  if (!dateStr) return 'Recently';
  const days = Math.floor((Date.now() - new Date(dateStr)) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export function parseSkills(skills) {
  if (!skills) return [];
  return skills.split(',').map((s) => s.trim()).filter(Boolean);
}
