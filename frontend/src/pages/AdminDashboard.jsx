import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Sparkles, Eye, Search, Plus, Pencil, Trash2, Briefcase, Loader2, AlertTriangle,
  MapPin, Building2, IndianRupee, LayoutDashboard, Users, ExternalLink, Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import api, { unwrap } from '../services/api';
import { useAuth } from '../context/auth';
import LoadingSpinner from '../components/LoadingSpinner';
import ApplicationStatusActions from '../components/ApplicationStatusActions';
import ChatPanel from '../components/ChatPanel';
import ProfilePanel from '../components/ProfilePanel';
import EmptyState from '../components/common/EmptyState';
import Pagination from '../components/common/Pagination';
import StatusBadge from '../components/common/StatusBadge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import SelectField from '../components/common/SelectField';
import { daysAgo, formatSalary, pluralize } from '../utils/formatters';
import { getApiErrorMessage } from '../utils/apiError';
import { notifyCountsChanged } from '../utils/events';
import { isLegacyCompanyName, resolveRecruiterCompany } from '../utils/recruiterCompany';
import { buildAiDefaults, scrubGlobalcoFromDescription, EXPERIENCE_LEVELS } from '../utils/jobFormDefaults';
import { matchScoreClass } from '../utils/applicationStatus';

const ApplicantStatusChart = lazy(() => import('../components/ApplicantStatusChart'));
const RecruiterOverviewCharts = lazy(() => import('../components/RecruiterOverviewCharts'));

const APPLICANTS_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

const DASHBOARD_TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'jobs', label: 'Jobs', icon: Briefcase },
  { key: 'applicants', label: 'Applicants', icon: Users },
  { key: 'ai', label: 'AI Generator', icon: Sparkles },
];

const NAV_ONLY_TABS = ['messages', 'profile'];

function StatTile({ value, label, className }) {
  return (
    <div className={cn('rounded-xl p-4', className)}>
      <p className="text-2xl font-bold">{value ?? 0}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function fetchOverview() {
  return Promise.allSettled([api.get('/api/admin/dashboard'), api.get('/api/admin/jobs')]);
}

function ChartFallback() {
  return <Skeleton className="h-72 w-full rounded-xl lg:col-span-2" />;
}

export default function AdminDashboard() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';
  const urlSearch = searchParams.get('q') || '';
  const jobFilter = searchParams.get('job') || '';
  const applicantPageParam = Math.max(0, Number(searchParams.get('page')) || 0);

  const [dashboard, setDashboard] = useState(null);
  const [applicantsData, setApplicantsData] = useState({ key: null, content: [], totalPages: 0, totalElements: 0 });
  const [jobs, setJobs] = useState([]);
  const [aiForm, setAiForm] = useState(() => buildAiDefaults(user));
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [refreshKey, setRefreshKey] = useState(0);

  const [prevLocation, setPrevLocation] = useState(user?.location ?? '');
  if (user && (user.location ?? '') !== prevLocation) {
    setPrevLocation(user.location ?? '');
    setAiForm((prev) => ({ ...prev, location: user.location?.trim() || prev.location }));
  }

  const [prevUrlSearch, setPrevUrlSearch] = useState(urlSearch);
  if (urlSearch !== prevUrlSearch) {
    setPrevUrlSearch(urlSearch);
    setSearchInput(urlSearch);
  }

  const updateParams = useCallback((changes) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(changes).forEach(([key, value]) => {
        if (value === '' || value == null || (key === 'page' && Number(value) === 0)) next.delete(key);
        else next.set(key, String(value));
      });
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const applyOverview = useCallback(([dash, jobList]) => {
    if (dash.status === 'fulfilled') setDashboard(unwrap(dash.value));
    if (jobList.status === 'fulfilled') setJobs(unwrap(jobList.value) || []);
    if ([dash, jobList].some((r) => r.status === 'rejected')) {
      toast.error('Some dashboard data failed to load');
    }
    setLoading(false);
  }, []);

  const load = useCallback(() => fetchOverview().then(applyOverview), [applyOverview]);

  useEffect(() => {
    fetchOverview().then(applyOverview);
    refreshUser().catch(() => {});
  }, [refreshUser, applyOverview]);

  useEffect(() => {
    if (searchInput === urlSearch) return undefined;
    const timer = setTimeout(() => updateParams({ q: searchInput.trim(), page: 0 }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, urlSearch, updateParams]);

  const applicantsKey = `${applicantPageParam}|${urlSearch}|${jobFilter}|${refreshKey}`;
  const applicantsLoading = tab === 'applicants' && applicantsData.key !== applicantsKey;

  useEffect(() => {
    if (tab !== 'applicants') return undefined;
    let cancelled = false;
    api.get('/api/admin/applicants', {
      params: {
        page: applicantPageParam,
        size: APPLICANTS_PAGE_SIZE,
        search: urlSearch.trim() || undefined,
        jobId: jobFilter || undefined,
      },
    })
      .then((res) => {
        if (cancelled) return;
        const data = unwrap(res) || {};
        setApplicantsData({
          key: applicantsKey,
          content: data.content || [],
          totalPages: data.totalPages ?? 0,
          totalElements: data.totalElements ?? 0,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(getApiErrorMessage(err, 'Could not load applicants'));
        setApplicantsData((prev) => ({ ...prev, key: applicantsKey }));
      });
    return () => { cancelled = true; };
  }, [tab, applicantsKey, applicantPageParam, urlSearch, jobFilter]);

  const applicants = applicantsData.content;

  const switchTab = (key) => {
    setSearchParams(key === 'overview' ? {} : { tab: key });
  };

  const refreshAfterChange = () => {
    load();
    setRefreshKey((k) => k + 1);
    notifyCountsChanged();
  };

  const deleteJob = async (id) => {
    try {
      await api.delete(`/api/jobs/${id}`);
      toast.success('Job deleted');
      if (jobFilter === String(id)) updateParams({ job: '', page: 0 });
      refreshAfterChange();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete job'));
    }
  };

  const company = resolveRecruiterCompany(user, '');

  const generateDescription = async () => {
    if (!aiForm.jobTitle?.trim() || !aiForm.skills?.trim()) {
      return toast.error('Job title and skills are required');
    }
    if (!company) {
      return toast.error('Set your company name in your Profile, then try again');
    }
    setGenerating(true);
    try {
      const res = await api.post('/api/ai/generate-job-description', aiForm);
      const description = unwrap(res).description;
      navigate('/admin/jobs/new', {
        state: {
          jobForm: {
            title: aiForm.jobTitle,
            skills: aiForm.skills,
            location: aiForm.location || user?.location?.trim() || '',
            experienceLevel: aiForm.experienceLevel || 'Mid-Level',
            description: scrubGlobalcoFromDescription(description, company),
            jobType: 'Full-time',
            category: 'Engineering',
            salaryMin: '',
            salaryMax: '',
          },
        },
      });
      toast.success('AI description generated — review and publish your job');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'AI generation failed'));
    } finally {
      setGenerating(false);
    }
  };

  const profileCompanyMissing = user && isLegacyCompanyName(user.companyName);

  if (loading) return <LoadingSpinner fullScreen />;

  const pageTitle = tab === 'messages' ? 'Messages' : tab === 'profile' ? 'Profile' : 'Recruiter Dashboard';
  const applicantBackTo = `${location.pathname}${location.search}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold">{pageTitle}</h1>

      {!NAV_ONLY_TABS.includes(tab) && (
        <Tabs value={tab} onValueChange={switchTab} className="mt-6">
          <div className="-mx-4 overflow-x-auto overflow-y-hidden px-4 py-1 sm:mx-0 sm:px-0">
            <TabsList className="w-max">
              {DASHBOARD_TABS.map(({ key, label, icon: Icon }) => (
                <TabsTrigger key={key} value={key} className="flex-none px-3">
                  <Icon /> {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      )}

      {profileCompanyMissing && tab !== 'profile' && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            Your profile still has a placeholder company name. Go to{' '}
            <Link to="/admin?tab=profile" className="font-semibold underline">Profile</Link>
            {' '}and set <strong>Company Name</strong> to your real company before posting jobs.
          </p>
        </div>
      )}

      {tab === 'overview' && dashboard && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Jobs Overview</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <StatTile value={dashboard.totalJobs} label="Total Jobs" className="bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300" />
              <StatTile value={dashboard.openJobs} label="Open Positions" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Applications</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <StatTile value={dashboard.totalApplications} label="Total Applications" className="bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300" />
              <StatTile value={dashboard.pendingApplications} label="Pending Review" className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300" />
            </CardContent>
          </Card>
          <Suspense fallback={<ChartFallback />}>
            <RecruiterOverviewCharts
              jobsByCategory={dashboard.jobsByCategory}
              applicationsByStatus={dashboard.applicationsByStatus}
            />
          </Suspense>
        </div>
      )}

      {tab === 'jobs' && (
        <div className="mt-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Your Job Listings</h2>
              <p className="text-sm text-muted-foreground">Create, edit, and manage job postings on dedicated pages</p>
            </div>
            <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
              <Link to="/admin/jobs/new"><Plus /> Post New Job</Link>
            </Button>
          </div>

          {jobs.length === 0 ? (
            <EmptyState icon={Briefcase} title="No jobs posted yet" description="Create your first listing to start receiving applications." actionLabel="Create your first listing" actionTo="/admin/jobs/new" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <Card key={job.id} className="gap-0 py-0">
                  <CardContent className="flex-1 p-5">
                    <p className="font-semibold leading-tight">{job.title}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Building2 className="size-3" />{job.company}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="size-3" />{job.location}</span>
                      <span className="flex items-center gap-1"><IndianRupee className="size-3" />{formatSalary(job.salaryMin, job.salaryMax)}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Badge
                        className={job.status === 'OPEN'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}
                      >
                        {job.status === 'OPEN' ? 'Open' : 'Closed'}
                      </Badge>
                      {job.featured && <Badge className="bg-accent text-accent-foreground">Featured</Badge>}
                    </div>
                  </CardContent>
                  <CardFooter className="gap-2 border-t p-3">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link to={`/jobs/${job.id}`}><ExternalLink /> View</Link>
                    </Button>
                    <Button asChild variant="secondary" size="sm" className="flex-1">
                      <Link to={`/admin/jobs/${job.id}/edit`}><Pencil /> Edit</Link>
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label={`Delete ${job.title}`}>
                          <Trash2 />
                        </Button>
                      }
                      title="Delete this job posting?"
                      description={`"${job.title}" will be removed and its open applications closed. Candidates are notified.`}
                      confirmLabel="Delete"
                      destructive
                      onConfirm={() => deleteJob(job.id)}
                    />
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'applicants' && (
        <div className="mt-8 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name, email, or job title..."
                aria-label="Search applicants"
                maxLength={100}
                className="h-10 pl-10"
              />
            </div>
            <SelectField
              value={jobFilter}
              onValueChange={(value) => updateParams({ job: value, page: 0 })}
              options={jobs.map((j) => ({ value: String(j.id), label: j.title }))}
              emptyLabel="All Jobs"
              aria-label="Filter by job"
              className="h-10 sm:w-64"
            />
          </div>

          <p className="text-sm text-muted-foreground" aria-live="polite">
            {applicantsLoading ? 'Loading applicants…' : pluralize(applicantsData.totalElements, 'application')}
          </p>

          <div className={cn('space-y-4', applicantsLoading && 'opacity-60')} aria-busy={applicantsLoading}>
            {applicants.length === 0 && !applicantsLoading ? (
              <EmptyState icon={Users} title="No applications found" description={urlSearch || jobFilter ? 'Try a different search or job filter. Names are searchable once you have opened an application.' : 'Applications to your jobs will appear here.'} />
            ) : (
              applicants.map((app) => (
                <Card key={app.id} className="gap-0 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-lg font-semibold">{app.userName}</p>
                        <StatusBadge status={app.status} className="py-0.5" />
                        {app.matchScore != null && (
                          <Badge className={cn('px-3', matchScoreClass(app.matchScore))}>
                            {app.matchScore}% match
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {app.recruiterViewed ? app.userEmail : 'View application to reveal contact details'}
                      </p>
                      <p className="mt-1 text-sm"><span className="font-medium">Applied for:</span> {app.jobTitle} · {app.company}</p>
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                        {app.userLocation && <span className="flex items-center gap-1"><MapPin className="size-3" />{app.userLocation}</span>}
                        <span className="flex items-center gap-1"><Clock className="size-3" />Applied {daysAgo(app.createdAt)}</span>
                      </div>
                      {app.coverLetter && (
                        <p className="mt-2 line-clamp-2 text-sm italic text-muted-foreground">"{app.coverLetter}"</p>
                      )}
                    </div>

                    <Button asChild>
                      <Link to={`/admin/applicants/${app.id}`} state={{ backTo: applicantBackTo }}><Eye /> View Application</Link>
                    </Button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
                    <span className="mr-1 text-xs text-muted-foreground">Quick actions:</span>
                    <ApplicationStatusActions
                      applicationId={app.id}
                      status={app.status}
                      size="xs"
                      onChanged={(status) => {
                        setApplicantsData((prev) => ({
                          ...prev,
                          content: prev.content.map((a) => (a.id === app.id ? { ...a, status } : a)),
                        }));
                        refreshAfterChange();
                      }}
                    />
                  </div>
                </Card>
              ))
            )}
          </div>

          <Pagination
            page={applicantPageParam}
            totalPages={applicantsData.totalPages}
            onPageChange={(page) => updateParams({ page })}
          />

          <Suspense fallback={<ChartFallback />}>
            <ApplicantStatusChart refreshKey={refreshKey} />
          </Suspense>
        </div>
      )}

      {tab === 'messages' && (
        <div className="mt-8 overflow-hidden">
          <ChatPanel embedded onUnreadChange={notifyCountsChanged} />
        </div>
      )}

      {tab === 'profile' && (
        <div className="mt-8 max-w-2xl">
          <ProfilePanel />
        </div>
      )}

      {tab === 'ai' && (
        <Card className="mt-8 max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="size-5 text-primary" /> AI Job Description Generator</CardTitle>
            <CardDescription>
              Descriptions use your recruiting company from your profile. Generated content opens on the new job page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                generateDescription();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="ai-title">Job title <span className="text-destructive">*</span></Label>
                <Input id="ai-title" placeholder="e.g. Java Full Stack Developer" maxLength={150} value={aiForm.jobTitle} onChange={(e) => setAiForm({ ...aiForm, jobTitle: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-company">Company</Label>
                <Input id="ai-company" value={company} readOnly disabled placeholder="Not set" />
                <p className={cn('text-xs', company ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400')}>
                  {company ? 'From your profile. ' : 'Set your company name in your profile first. '}
                  <Link to="/admin?tab=profile" className="underline">Edit profile</Link>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-location">Location</Label>
                <Input id="ai-location" placeholder="Hyderabad / Remote" maxLength={150} value={aiForm.location} onChange={(e) => setAiForm({ ...aiForm, location: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-experience">Experience level</Label>
                <SelectField
                  id="ai-experience"
                  value={aiForm.experienceLevel}
                  onValueChange={(v) => setAiForm({ ...aiForm, experienceLevel: v })}
                  options={EXPERIENCE_LEVELS}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-skills">Skills (comma separated) <span className="text-destructive">*</span></Label>
                <Input id="ai-skills" placeholder="Java, Spring Boot, React" maxLength={1000} value={aiForm.skills} onChange={(e) => setAiForm({ ...aiForm, skills: e.target.value })} required />
              </div>
              <Button type="submit" disabled={generating || !company}>
                {generating ? <Loader2 className="animate-spin" /> : <Sparkles />}
                {generating ? 'Generating…' : 'Generate & Open Job Form'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
