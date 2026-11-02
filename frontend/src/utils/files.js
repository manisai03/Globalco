// Must match FileStorageService.RESUME_EXTENSIONS and spring.servlet.multipart.max-file-size.
export const RESUME_EXTENSIONS = ['.pdf', '.doc', '.docx'];
export const MAX_RESUME_BYTES = 10 * 1024 * 1024;

export function validateResumeFile(file) {
  if (!file) return null;
  const name = file.name?.toLowerCase() || '';
  if (!RESUME_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return 'Resume must be a PDF, DOC, or DOCX file';
  }
  if (file.size > MAX_RESUME_BYTES) return 'Resume must be 10 MB or smaller';
  if (file.size === 0) return 'This file is empty';
  return null;
}
