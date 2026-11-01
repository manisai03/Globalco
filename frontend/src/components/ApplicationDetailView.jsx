import { useEffect, useState } from 'react';
import { Mail, Phone, MapPin, MessageSquare, FileX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api, { unwrap } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import JobMatchScore from './JobMatchScore';
import ResumeViewer from './ResumeViewer';
import EmptyState from './common/EmptyState';
import StatusBadge from './common/StatusBadge';
import { daysAgo, parseSkills } from '../utils/formatters';
import { formatStatus } from '../utils/applicationStatus';

const STATUS_ACTIONS = ['SHORTLISTED', 'REJECTED', 'INTERVIEW_SCHEDULED', 'HIRED'];

function Section({ title, children }) {
  return (
    <Card className="gap-3 py-5">
      <CardHeader className="px-5"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="px-5 text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  );
}

export default function ApplicationDetailView({
  applicationId,
  adminMode = true,
  onStatusUpdate,
  onMessage,
}) {
  const [result, setResult] = useState({ id: null, detail: null });

  useEffect(() => {
    let cancelled = false;
    api.get(`/api/applications/${applicationId}`)
      .then((res) => { if (!cancelled) setResult({ id: applicationId, detail: unwrap(res) }); })
      .catch(() => { if (!cancelled) setResult({ id: applicationId, detail: null }); });
    return () => { cancelled = true; };
  }, [applicationId]);

  if (result.id !== applicationId) return <LoadingSpinner fullScreen />;

  const { detail } = result;
  if (!detail) {
    return <EmptyState icon={FileX} title="Application not found" description="It may have been withdrawn or you don't have access to it." />;
  }

  const resumePath = detail.applicationResumeUrl || detail.userProfileResumeUrl;
  const skills = parseSkills(detail.userSkills);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold">{detail.userName}</h2>
          <p className="text-muted-foreground">{detail.userEmail}</p>
          <p className="mt-1 text-sm text-muted-foreground">{detail.jobTitle} at {detail.company}</p>
          <StatusBadge status={detail.status} className="mt-2" />
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p>Applied {daysAgo(detail.createdAt)}</p>
          <p>{new Date(detail.createdAt).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Section title="Contact Information">
          <div className="space-y-2 text-foreground">
            <p className="flex items-center gap-2 break-all"><Mail className="size-4 shrink-0 text-muted-foreground" />{detail.userEmail}</p>
            {detail.userPhone && <p className="flex items-center gap-2"><Phone className="size-4 text-muted-foreground" />{detail.userPhone}</p>}
            {detail.userLocation && <p className="flex items-center gap-2"><MapPin className="size-4 text-muted-foreground" />{detail.userLocation}</p>}
          </div>
        </Section>
        <Section title="Applied For">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="font-medium text-foreground">Role</dt><dd>{detail.jobTitle}</dd>
            <dt className="font-medium text-foreground">Location</dt><dd>{detail.jobLocation}</dd>
            <dt className="font-medium text-foreground">Type</dt><dd>{detail.jobType}</dd>
            <dt className="font-medium text-foreground">Experience</dt><dd>{detail.jobExperienceLevel || 'Not specified'}</dd>
          </dl>
        </Section>
      </div>

      {skills.length > 0 && (
        <Section title="Candidate Skills">
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
          </div>
        </Section>
      )}

      {detail.userBio && (
        <Section title="About Candidate">
          <p className="whitespace-pre-wrap">{detail.userBio}</p>
        </Section>
      )}

      {detail.coverLetter && (
        <Section title="Cover Letter">
          <p className="whitespace-pre-wrap leading-relaxed">{detail.coverLetter}</p>
        </Section>
      )}

      <Section title="Resume Submitted by Applicant">
        <ResumeViewer resumePath={resumePath} showInlinePreview={false} />
      </Section>

      {detail.matchBreakdown && <JobMatchScore match={detail.matchBreakdown} />}

      {adminMode && (
        <Card className="flex-row flex-wrap items-center justify-between gap-3 bg-muted/50 p-4">
          <Button type="button" onClick={() => onMessage?.(detail)}>
            <MessageSquare /> Message Candidate
          </Button>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Update status">
            {STATUS_ACTIONS.map((s) => (
              <Button
                key={s}
                type="button"
                size="sm"
                variant={detail.status === s ? 'default' : 'outline'}
                aria-pressed={detail.status === s}
                disabled={detail.status === 'WITHDRAWN'}
                onClick={() => onStatusUpdate?.(detail.id, s)}
              >
                {formatStatus(s)}
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
