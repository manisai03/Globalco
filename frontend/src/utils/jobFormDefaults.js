import { resolveRecruiterCompany } from './recruiterCompany';

export const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Remote', 'Internship'];
export const CATEGORIES = ['Engineering', 'Design', 'Marketing', 'Sales', 'Finance', 'HR', 'Operations', 'Data Science'];
export const EXPERIENCE_LEVELS = ['Entry', 'Mid-Level', 'Senior', 'Lead'];

export function buildJobDefaults(user) {
  return {
    title: '',
    company: resolveRecruiterCompany(user, ''),
    description: '',
    location: user?.location?.trim() || '',
    salaryMin: '',
    salaryMax: '',
    experienceLevel: 'Mid-Level',
    jobType: 'Full-time',
    category: 'Engineering',
    skills: '',
    featured: false,
  };
}

export function buildAiDefaults(user) {
  return {
    jobTitle: '',
    skills: '',
    company: resolveRecruiterCompany(user, ''),
    location: user?.location?.trim() || '',
    experienceLevel: 'Mid-Level',
  };
}

export function scrubGlobalcoFromDescription(description, company) {
  if (!description || !company) return description;
  return description
    .replace(/Globalco Technologies/gi, company)
    .replace(/\bGlobalco\b/gi, company);
}

export function jobToForm(job, user) {
  const company = resolveRecruiterCompany(user, job.company) || job.company;
  return {
    title: job.title,
    company,
    description: scrubGlobalcoFromDescription(job.description, company),
    location: job.location,
    salaryMin: job.salaryMin || '',
    salaryMax: job.salaryMax || '',
    experienceLevel: job.experienceLevel || 'Mid-Level',
    jobType: job.jobType,
    category: job.category || 'Engineering',
    skills: job.skills || '',
    featured: job.featured,
  };
}
