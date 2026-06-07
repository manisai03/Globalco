import { Link } from 'react-router-dom';
import { MapPin, Briefcase, Bookmark, BookmarkCheck } from 'lucide-react';

export default function JobCard({ job, onSave, onUnsave }) {
  const formatSalary = () => {
    if (!job.salaryMin && !job.salaryMax) return 'Competitive';
    const fmt = (n) => `₹${(n / 100000).toFixed(1)}L`;
    if (job.salaryMin && job.salaryMax) return `${fmt(job.salaryMin)} - ${fmt(job.salaryMax)}`;
    return job.salaryMax ? `Up to ${fmt(job.salaryMax)}` : `From ${fmt(job.salaryMin)}`;
  };

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-primary-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <Link to={`/jobs/${job.id}`} className="text-lg font-semibold text-slate-900 hover:text-primary-600 dark:text-white">
            {job.title}
          </Link>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{job.company}</p>
        </div>
        {onSave && (
          <button
            onClick={() => (job.saved ? onUnsave(job.id) : onSave(job.id))}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-primary-600 dark:hover:bg-slate-800"
            aria-label={job.saved ? 'Unsave job' : 'Save job'}
          >
            {job.saved ? <BookmarkCheck className="h-5 w-5 text-primary-600" /> : <Bookmark className="h-5 w-5" />}
          </button>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
        <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{job.location}</span>
        <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" />{job.jobType}</span>
        <span>{formatSalary()}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {job.category && (
          <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
            {job.category}
          </span>
        )}
        {job.experienceLevel && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {job.experienceLevel}
          </span>
        )}
        {job.applied && (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-300">
            Applied
          </span>
        )}
      </div>
    </div>
  );
}
