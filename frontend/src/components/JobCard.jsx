import { Link } from 'react-router-dom';
import { MapPin, Briefcase, Bookmark, BookmarkCheck, Clock, Sparkles } from 'lucide-react';
import { daysAgo } from '../utils/formatters';

export default function JobCard({ job, onSave, onUnsave, compact = false }) {
  const formatSalary = () => {
    if (!job.salaryMin && !job.salaryMax) return 'Competitive';
    const fmt = (n) => `₹${(n / 100000).toFixed(1)}L`;
    if (job.salaryMin && job.salaryMax) return `${fmt(job.salaryMin)} – ${fmt(job.salaryMax)}`;
    return job.salaryMax ? `Up to ${fmt(job.salaryMax)}` : `From ${fmt(job.salaryMin)}`;
  };

  const matchScore = job.matchPreview?.overallScore;

  return (
    <article className={`card group p-5 transition hover:border-primary-300 hover:shadow-md ${compact ? 'p-4' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/jobs/${job.id}`} className={`font-semibold text-slate-900 hover:text-primary-600 dark:text-white ${compact ? 'text-base' : 'text-lg'}`}>
              {job.title}
            </Link>
            {job.featured && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                <Sparkles className="h-3 w-3" /> Featured
              </span>
            )}
          </div>
          {job.createdById ? (
            <Link to={`/companies/${job.createdById}`} onClick={(e) => e.stopPropagation()} className="mt-1 block truncate text-sm text-slate-500 hover:text-primary-600 dark:text-slate-400">
              {job.company}
            </Link>
          ) : (
            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{job.company}</p>
          )}
        </div>
        {onSave && (
          <button
            type="button"
            onClick={() => (job.saved ? onUnsave(job.id) : onSave(job.id))}
            className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-primary-600 dark:hover:bg-slate-800"
            aria-label={job.saved ? 'Unsave job' : 'Save job'}
          >
            {job.saved ? <BookmarkCheck className="h-5 w-5 text-primary-600" /> : <Bookmark className="h-5 w-5" />}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />{job.location}</span>
        <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5 shrink-0 text-slate-400" />{job.jobType}</span>
        <span>{formatSalary()}</span>
        {job.createdAt && (
          <span className="flex items-center gap-1 text-slate-400"><Clock className="h-3.5 w-3.5" />{daysAgo(job.createdAt)}</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {job.category && (
          <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
            {job.category}
          </span>
        )}
        {job.experienceLevel && (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {job.experienceLevel}
          </span>
        )}
        {matchScore != null && matchScore > 0 && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            {matchScore}% match
          </span>
        )}
        {job.applied && (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
            Applied
          </span>
        )}
      </div>
    </article>
  );
}
