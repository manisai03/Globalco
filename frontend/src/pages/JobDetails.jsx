import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  MapPin, Briefcase, Share2, Bookmark, BookmarkCheck, Clock, Users, IndianRupee,
  CheckCircle2, Zap, ExternalLink, Building2, Loader2, SearchX,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import api, { loginUrl, unwrap } from '../services/api';
import { useAuth } from '../context/auth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import JobMatchScore from '../components/JobMatchScore';
import JobDescription from '../components/JobDescription';
import ResumeUploadBox from '../components/ResumeUploadBox';
import { getApiErrorMessage } from '../utils/apiError';
import { validateResumeFile } from '../utils/files';
import { formatSalary, daysAgo, parseSkills, pluralize } from '../utils/formatters';

// Must match ApplicationService.MAX_COVER_LETTER_LENGTH.
const COVER_LETTER_MAX = 5000;

export default function JobDetails() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({ id: null, job: null, error: false });
  const [similar, setSimilar] = useState({ id: null, jobs: [] });
  const [coverLetter, setCoverLetter] = useState('');
  const [resume, setResume] = useState(null);
  const [applying, setApplying] = useState(false);
  const [easyApplying, setEasyApplying] = useState(false);
  const [saving, setSaving] = useState(false);

  const refreshJob = useCallback(
    () => api.get(`/api/jobs/${id}`).then((res) => setState({ id, job: unwrap(res), error: false })),
    [id]
  );

  useEffect(() => {
    let cancelled = false;
    api.get(`/api/jobs/${id}`)
      .then((res) => { if (!cancelled) setState({ id, job: unwrap(res), error: false }); })
      .catch(() => { if (!cancelled) setState({ id, job: null, error: true }); });
    api.get(`/api/jobs/${id}/similar`)
      .then((res) => { if (!cancelled) setSimilar({ id, jobs: unwrap(res) || [] }); })
      .catch(() => { if (!cancelled) setSimilar({ id, jobs: [] }); });
    return () => { cancelled = true; };
  }, [id]);

  const job = state.id === id ? state.job : null;
  const similarJobs = similar.id === id ? similar.jobs : [];
  useDocumentTitle(job ? `${job.title} at ${job.company}` : 'Job details');
  const goToLogin = () => navigate(loginUrl(`/jobs/${id}`));

  if (state.id === id && state.error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState icon={SearchX} title="Job not found" description="This job may have been closed or removed." actionLabel="Browse jobs" actionTo="/jobs" />
      </div>
    );
  }

  if (!job) return <LoadingSpinner fullScreen />;

  const skillTags = parseSkills(job.skills);
  const highlights = [
    job.experienceLevel && `${job.experienceLevel} experience`,
    job.jobType && `${job.jobType} role`,
    job.category && `${job.category} department`,
    skillTags.length > 0 && `Skills: ${skillTags.slice(0, 4).join(', ')}`,
  ].filter(Boolean);

  const submitting = applying || easyApplying;

  const submitApplication = async (easy = false) => {
    if (!user) return goToLogin();
    if (submitting) return;
    if (!easy) {
      const resumeErr = validateResumeFile(resume);
      if (resumeErr) return toast.error(resumeErr);
    }
    if (easy) setEasyApplying(true);
    else setApplying(true);
    try {
      const formData = new FormData();
      if (!easy && coverLetter.trim()) formData.append('coverLetter', coverLetter.trim());
      if (!easy && resume) formData.append('resume', resume);
      await api.post(`/api/applications/jobs/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(easy ? 'Easy Apply submitted!' : 'Application submitted!');
      await refreshJob().catch(() => {});
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Application failed'));
    } finally {
      setApplying(false);
      setEasyApplying(false);
    }
  };

  const toggleSave = async () => {
    if (!user) return goToLogin();
    setSaving(true);
    try {
      if (job.saved) {
        await api.delete(`/api/saved-jobs/${id}`);
        toast.success('Removed from saved');
      } else {
        await api.post(`/api/saved-jobs/${id}`);
        toast.success('Job saved');
      }
      await refreshJob();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Something went wrong'));
    } finally {
      setSaving(false);
    }
  };

  const shareJob = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: job.title, text: `${job.title} at ${job.company}`, url: window.location.href });
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied!');
    } catch (err) {
      if (err?.name !== 'AbortError') toast.error('Could not share this link');
    }
  };

  const canApply = user && !isAdmin && !job.applied && job.status === 'OPEN';
  const companyBlurb = job.companyDescription || `${job.company} is hiring for this role. Connect with the recruiter to learn more about the team and culture.`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="gap-0 p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold sm:text-3xl">{job.title}</h1>
                <p className="mt-2 text-lg font-medium text-muted-foreground">{job.company}</p>
                {job.createdById && (
                  <Button asChild variant="link" className="h-auto px-0">
                    <Link to={`/companies/${job.createdById}`}><Building2 /> View company page</Link>
                  </Button>
                )}
                {job.recruiterTitle && job.createdByName && (
                  <p className="mt-1 text-sm text-muted-foreground">Posted by {job.createdByName} · {job.recruiterTitle}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="outline" size="icon" onClick={shareJob} aria-label="Share job">
                      <Share2 />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Share</TooltipContent>
                </Tooltip>
                {user && !isAdmin && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={toggleSave}
                        disabled={saving}
                        aria-label={job.saved ? 'Unsave job' : 'Save job'}
                        aria-pressed={!!job.saved}
                      >
                        {job.saved ? <BookmarkCheck className="text-primary" /> : <Bookmark />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{job.saved ? 'Saved' : 'Save'}</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-2 text-sm"><Briefcase className="size-4 text-muted-foreground" /><span>{job.experienceLevel || 'Not specified'}</span></div>
              <div className="flex items-center gap-2 text-sm"><IndianRupee className="size-4 text-muted-foreground" /><span>{formatSalary(job.salaryMin, job.salaryMax)}</span></div>
              <div className="flex items-center gap-2 text-sm"><MapPin className="size-4 text-muted-foreground" /><span>{job.location}</span></div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="size-4" />Posted {daysAgo(job.createdAt)}</span>
              <span className="flex items-center gap-1"><Users className="size-4" />{pluralize(job.applicantCount, 'applicant')}</span>
              {job.jobType && <Badge variant="secondary">{job.jobType}</Badge>}
              {job.status && job.status !== 'OPEN' && <Badge variant="destructive">No longer accepting applications</Badge>}
            </div>

            {isAdmin ? (
              <p className="mt-6 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                Recruiter view — candidates apply from this page.
              </p>
            ) : job.applied ? (
              <Button type="button" disabled size="lg" className="mt-6 w-full bg-emerald-600 disabled:opacity-100 sm:w-auto sm:px-12">
                <CheckCircle2 /> Applied
              </Button>
            ) : job.status === 'OPEN' && (
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  type="button"
                  size="lg"
                  onClick={() => (user ? submitApplication(true) : goToLogin())}
                  disabled={submitting}
                >
                  {easyApplying ? <Loader2 className="animate-spin" /> : <Zap />}
                  {easyApplying ? 'Applying…' : 'Easy Apply'}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => (user ? document.getElementById('apply-section')?.scrollIntoView({ behavior: 'smooth' }) : goToLogin())}
                >
                  Apply with cover letter
                </Button>
              </div>
            )}
          </Card>

          {highlights.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Job highlights</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      {h}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {user && !isAdmin && !job.applied && job.matchPreview && (
            <JobMatchScore match={job.matchPreview} />
          )}

          <Card>
            <CardHeader><CardTitle className="text-lg">Job description</CardTitle></CardHeader>
            <CardContent><JobDescription text={job.description} /></CardContent>
          </Card>

          {skillTags.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Key skills</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {skillTags.map((skill) => (
                  <Badge key={skill} variant="outline" className="rounded-lg border-primary/30 bg-accent px-3 py-1.5 text-sm text-accent-foreground">
                    {skill}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}

          {canApply && (
            <Card id="apply-section" className="scroll-mt-36 border-2 border-primary/30">
              <CardHeader>
                <CardTitle className="text-lg">Full application</CardTitle>
                <CardDescription>Add a cover letter or upload a tailored resume</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cover-letter">Cover letter</Label>
                  <Textarea
                    id="cover-letter"
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Why you're a great fit for this role…"
                    rows={5}
                    maxLength={COVER_LETTER_MAX}
                  />
                  <p className="text-right text-xs text-muted-foreground">{coverLetter.length}/{COVER_LETTER_MAX}</p>
                </div>
                <ResumeUploadBox
                  compact
                  label="Upload resume"
                  fileName={resume?.name}
                  onUpload={(e) => {
                    const file = e.target.files?.[0] || null;
                    const err = validateResumeFile(file);
                    if (err) {
                      toast.error(err);
                      e.target.value = '';
                      return;
                    }
                    setResume(file);
                  }}
                  hint={!resume ? 'PDF, DOC or DOCX up to 10 MB. Your profile resume is used if no file is uploaded.' : undefined}
                />
                <Button type="button" onClick={() => submitApplication(false)} disabled={submitting} className="w-full sm:w-auto">
                  {applying && <Loader2 className="animate-spin" />}
                  {applying ? 'Submitting…' : 'Submit application'}
                </Button>
              </CardContent>
            </Card>
          )}

          {job.applied && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
              <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="size-5" /> You applied for this job</div>
              <p className="mt-2 text-sm">Track status in your dashboard.</p>
              <Link to="/dashboard" className="mt-3 inline-block text-sm font-medium underline">My applications →</Link>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card className="gap-2">
            <CardHeader><CardTitle className="text-base">Salary</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{formatSalary(job.salaryMin, job.salaryMax)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Annual CTC range</p>
            </CardContent>
          </Card>

          <Card className="gap-3">
            <CardHeader><CardTitle className="text-base">About {job.company}</CardTitle></CardHeader>
            <CardContent>
              {job.location && <p className="text-sm text-muted-foreground">{job.location}</p>}
              <p className="mt-2 text-sm text-muted-foreground">{companyBlurb}</p>
              {job.companyWebsite && (
                <Button asChild variant="link" className="mt-2 h-auto px-0">
                  <a href={job.companyWebsite} target="_blank" rel="noopener noreferrer">
                    Company website <ExternalLink />
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>

          {similarJobs.length > 0 && (
            <Card className="gap-3">
              <CardHeader><CardTitle className="text-base">Similar jobs</CardTitle></CardHeader>
              <CardContent>
                {similarJobs.map((j, i) => (
                  <div key={j.id}>
                    {i > 0 && <Separator className="my-4" />}
                    <Link to={`/jobs/${j.id}`} className="font-medium transition-colors hover:text-primary">{j.title}</Link>
                    <p className="text-sm text-muted-foreground">{j.company}</p>
                    <p className="text-xs text-muted-foreground">{j.location} · {daysAgo(j.createdAt)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
