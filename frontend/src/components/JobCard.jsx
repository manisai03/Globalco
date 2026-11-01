import { Link } from 'react-router-dom';
import { MapPin, Briefcase, Bookmark, BookmarkCheck, Clock, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { daysAgo, formatSalaryShort } from '../utils/formatters';

export default function JobCard({ job, onSave, onUnsave, compact = false }) {
  const matchScore = job.matchPreview?.overallScore;

  return (
    <Card
      className={cn(
        'group gap-0 transition hover:border-primary/40 hover:shadow-md',
        compact ? 'p-4' : 'p-5'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/jobs/${job.id}`}
              className={cn('font-semibold transition-colors hover:text-primary', compact ? 'text-base' : 'text-lg')}
            >
              {job.title}
            </Link>
            {job.featured && (
              <Badge className="bg-amber-100 text-[10px] uppercase tracking-wide text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                <Sparkles /> Featured
              </Badge>
            )}
          </div>
          {job.createdById ? (
            <Link
              to={`/companies/${job.createdById}`}
              onClick={(e) => e.stopPropagation()}
              className="mt-1 block truncate text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {job.company}
            </Link>
          ) : (
            <p className="mt-1 truncate text-sm text-muted-foreground">{job.company}</p>
          )}
        </div>
        {onSave && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => (job.saved ? onUnsave(job.id) : onSave(job.id))}
            className="shrink-0 text-muted-foreground hover:text-primary"
            aria-label={job.saved ? 'Unsave job' : 'Save job'}
            aria-pressed={!!job.saved}
          >
            {job.saved ? <BookmarkCheck className="size-5 text-primary" /> : <Bookmark className="size-5" />}
          </Button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1"><MapPin className="size-3.5 shrink-0" />{job.location}</span>
        <span className="flex items-center gap-1"><Briefcase className="size-3.5 shrink-0" />{job.jobType}</span>
        <span className="font-medium text-foreground">{formatSalaryShort(job.salaryMin, job.salaryMax)}</span>
        {job.createdAt && (
          <span className="flex items-center gap-1"><Clock className="size-3.5" />{daysAgo(job.createdAt)}</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {job.category && (
          <Badge className="bg-accent text-accent-foreground">{job.category}</Badge>
        )}
        {job.experienceLevel && <Badge variant="secondary">{job.experienceLevel}</Badge>}
        {matchScore != null && matchScore > 0 && (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            {matchScore}% match
          </Badge>
        )}
        {job.applied && (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Applied</Badge>
        )}
      </div>
    </Card>
  );
}
