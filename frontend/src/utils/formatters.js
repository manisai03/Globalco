export function formatSalary(min, max) {
  if (!min && !max) return 'Not disclosed';
  const fmt = (n) => `₹${(Number(n) / 100000).toFixed(1)} Lacs P.A.`;
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  return max ? `Up to ${fmt(max)}` : `From ${fmt(min)}`;
}

export function daysAgo(dateStr) {
  if (!dateStr) return 'Recently';
  const days = Math.floor((Date.now() - new Date(dateStr)) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export function fileUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  return `${base}${path}`;
}

export function parseSkills(skills) {
  if (!skills) return [];
  return skills.split(',').map((s) => s.trim()).filter(Boolean);
}
