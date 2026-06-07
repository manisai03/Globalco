import { useRef } from 'react';
import { Upload, FileText, CheckCircle2 } from 'lucide-react';

export default function ResumeUploadBox({
  resumeUrl,
  onUpload,
  fileName,
  compact = false,
  label = 'Resume',
  hint,
}) {
  const inputRef = useRef(null);
  const displayName = fileName || (resumeUrl ? resumeUrl.split('/').pop() : null);

  const box = (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      className="group cursor-pointer rounded-2xl border-2 border-dashed border-primary-300 bg-primary-50/40 px-6 py-10 text-center shadow-inner transition hover:border-primary-500 hover:bg-primary-50 dark:border-primary-700 dark:bg-primary-950/20 dark:hover:border-primary-500"
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary-200 bg-white shadow-sm transition group-hover:scale-105 dark:border-primary-800 dark:bg-slate-900">
        {displayName ? (
          <CheckCircle2 className="h-7 w-7 text-emerald-500" />
        ) : (
          <Upload className="h-7 w-7 text-primary-600" />
        )}
      </div>
      <p className="mt-4 text-base font-semibold text-primary-700 dark:text-primary-400">
        {displayName ? displayName : 'Click to choose resume file'}
      </p>
      <p className="mt-2 text-sm text-slate-500">
        {displayName ? 'Click to replace file' : 'or drag and drop your resume here'}
      </p>
      <p className="mt-3 inline-block rounded-full bg-white px-4 py-1.5 text-xs font-medium text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
        PDF, DOC, DOCX · Max 10MB
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={onUpload}
        className="hidden"
      />
    </div>
  );

  if (compact) {
    return (
      <div>
        {label && <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</p>}
        {box}
        {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary-600" />
        <h2 className="font-semibold">{label}</h2>
      </div>
      <div className="mt-4">{box}</div>
    </div>
  );
}
