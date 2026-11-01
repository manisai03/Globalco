import { CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const CRITERIA = [
  { key: 'earlyApplicant', label: 'Early Applicant' },
  { key: 'skillsMatch', label: 'Key Skills' },
  { key: 'locationMatch', label: 'Location' },
  { key: 'profileComplete', label: 'Profile & Resume' },
];

export default function JobMatchScore({ match, showSkills = true }) {
  if (!match) return null;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-emerald-900 dark:text-emerald-200">Job Match Score</h3>
          <p className="text-sm text-emerald-700 dark:text-emerald-400">Based on your profile vs job requirements</p>
          <Progress
            value={match.overallScore}
            className="mt-3 h-2 bg-emerald-100 dark:bg-emerald-900/40 [&>[data-slot=progress-indicator]]:bg-emerald-600"
            aria-label="Match score"
          />
        </div>
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xl font-bold text-white">
          {match.overallScore}%
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {CRITERIA.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2 text-sm">
            {match[key] ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            ) : (
              <XCircle className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className={match[key] ? 'text-emerald-800 dark:text-emerald-300' : 'text-muted-foreground'}>{label}</span>
          </div>
        ))}
      </div>

      {showSkills && (match.matchedSkills?.length > 0 || match.missingSkills?.length > 0) && (
        <div className="mt-4 space-y-3 border-t border-emerald-200 pt-4 dark:border-emerald-900/40">
          {match.matchedSkills?.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-400">Matching Skills</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {match.matchedSkills.map((s) => (
                  <Badge key={s} className="bg-emerald-100 px-3 py-1 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">{s}</Badge>
                ))}
              </div>
            </div>
          )}
          {match.missingSkills?.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skills to develop</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {match.missingSkills.map((s) => (
                  <Badge key={s} variant="secondary" className="px-3 py-1">{s}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
