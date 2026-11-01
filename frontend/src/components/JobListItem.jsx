import { Link } from 'react-router-dom';
import { MapPin, Bookmark, BookmarkCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { daysAgo, formatSalaryShort } from '../utils/formatters';

export default function JobListItem({ job, onSave, onUnsave }) {
  return (
    <Link
      to={`/jobs/${job.id}`}
      className="block rounded-xl border bg-card p-4 text-left text-card-foreground transition hover:border-primary/40 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{job.title}</h3>
          <p className="truncate text-sm text-muted-foreground">{job.company}</p>
        </div>
        {onSave && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.preventDefault();
              if (job.saved) onUnsave(job.id);
              else onSave(job.id);
            }}
            className="shrink-0 text-muted-foreground hover:text-primary"
            aria-label={job.saved ? 'Unsave' : 'Save'}
            aria-pressed={!!job.saved}
          >
            {job.saved ? <BookmarkCheck className="text-primary" /> : <Bookmark />}
          </Button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><MapPin className="size-3" />{job.location}</span>
        <span>{formatSalaryShort(job.salaryMin, job.salaryMax)}</span>
        {job.createdAt && <span>{daysAgo(job.createdAt)}</span>}
      </div>
      {job.matchPreview?.overallScore > 0 && (
        <Badge className="mt-2 bg-emerald-100 text-[10px] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          {job.matchPreview.overallScore}% match
        </Badge>
      )}
    </Link>
  );
}
