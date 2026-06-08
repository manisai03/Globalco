import { Link } from 'react-router-dom';
import { MapPin, Bookmark, BookmarkCheck } from 'lucide-react';
import { daysAgo } from '../utils/formatters';

export default function JobListItem({ job, selected, onSelect, onSave, onUnsave }) {
  const formatSalary = () => {
    if (!job.salaryMin && !job.salaryMax) return 'Competitive';
    const fmt = (n) => `₹${(n / 100000).toFixed(1)}L`;
    if (job.salaryMin && job.salaryMax) return `${fmt(job.salaryMin)} – ${fmt(job.salaryMax)}`;
    return job.salaryMax ? `Up to ${fmt(job.salaryMax)}` : `From ${fmt(job.salaryMin)}`;
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(job.id)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect?.(job.id)}
      className={`cursor-pointer rounded-xl border p-4 text-left transition ${
        selected
          ? 'border-primary-500 bg-primary-50/60 ring-1 ring-primary-500 dark:bg-primary-950/30'
          : 'border-slate-200 bg-white hover:border-primary-300 dark:border-slate-800 dark:bg-slate-900'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-900 dark:text-white">{job.title}</h3>
          <p className="truncate text-sm text-slate-500">{job.company}</p>
        </div>
        {onSave && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); job.saved ? onUnsave(job.id) : onSave(job.id); }}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:text-primary-600"
            aria-label={job.saved ? 'Unsave' : 'Save'}
          >
            {job.saved ? <BookmarkCheck className="h-4 w-4 text-primary-600" /> : <Bookmark className="h-4 w-4" />}
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
        <span>{formatSalary()}</span>
        {job.createdAt && <span>{daysAgo(job.createdAt)}</span>}
      </div>
      {job.matchPreview?.overallScore > 0 && (
        <span className="mt-2 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          {job.matchPreview.overallScore}% match
        </span>
      )}
      <Link
        to={`/jobs/${job.id}`}
        onClick={(e) => e.stopPropagation()}
        className="mt-2 inline-block text-xs font-medium text-primary-600 hover:underline lg:hidden"
      >
        View details →
      </Link>
    </div>
  );
}
