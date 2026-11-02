import { describe, expect, it } from 'vitest';
import { validateResumeFile } from './files';

const file = (name, size) => ({ name, size });

describe('validateResumeFile', () => {
  it('accepts PDF and Word files up to 10 MB', () => {
    expect(validateResumeFile(file('cv.PDF', 1000))).toBeNull();
    expect(validateResumeFile(file('cv.docx', 10 * 1024 * 1024))).toBeNull();
    expect(validateResumeFile(null)).toBeNull();
  });

  it('rejects other types, oversized and empty files', () => {
    expect(validateResumeFile(file('cv.png', 1000))).toMatch(/PDF/);
    expect(validateResumeFile(file('cv.pdf', 10 * 1024 * 1024 + 1))).toMatch(/10 MB/);
    expect(validateResumeFile(file('cv.pdf', 0))).toMatch(/empty/);
  });
});
