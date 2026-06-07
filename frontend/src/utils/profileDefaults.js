export const emptyEducationLevel = () => ({
  course: '',
  collegeName: '',
  specialization: '',
  grades: '',
  startYear: '',
  endYear: '',
});

export const defaultEducation = () => ({
  school: emptyEducationLevel(),
  intermediate: emptyEducationLevel(),
  college: emptyEducationLevel(),
});

export const emptyInternship = () => ({
  companyName: '',
  startMonth: '',
  startYear: '',
  endMonth: '',
  endYear: '',
  projectName: '',
  description: '',
  keySkills: '',
  projectUrl: '',
});

export const emptyEmployment = () => ({
  companyName: '',
  experienceYears: '',
  experienceMonths: '',
  designation: '',
  startMonth: '',
  startYear: '',
  endMonth: '',
  endYear: '',
  description: '',
});

export function parseJsonField(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
