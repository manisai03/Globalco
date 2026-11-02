import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileText, Bookmark, Bell, Calendar, MapPin, Trash2, Eye, Inbox, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import ChatPanel from '../components/ChatPanel';
import ProfilePanel from '../components/ProfilePanel';
import api, { unwrap } from '../services/api';
import JobCard from '../components/JobCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import StatusBadge from '../components/common/StatusBadge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { WITHDRAWABLE_STATUSES, matchScoreClass } from '../utils/applicationStatus';
import { getApiErrorMessage } from '../utils/apiError';
import { notifyCountsChanged } from '../utils/events';
import { pluralize } from '../utils/formatters';

const DASHBOARD_TABS = [
  { key: 'applications', label: 'Applications', icon: FileText },
  { key: 'interviews', label: 'Application Status', icon: Calendar },
  { key: 'saved', label: 'Saved Jobs', icon: Bookmark },
  { key: 'alerts', label: 'Job Alerts', icon: Bell },
];

const APPLICATION_DATE_FILTERS = [
  { key: 'today', label: 'Today' },
  { key: '3days', label: 'Last 3 days' },
  { key: 'week', label: 'Past week' },
];

const INTERVIEW_STATUS_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'SHORTLISTED', label: 'Shortlisted' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'HIRED', label: 'Hired' },
  { key: 'INTERVIEW_SCHEDULED', label: 'Interview Scheduled' },
];

const NAV_ONLY_TABS = ['messages', 'profile'];

const PAGE_SUBTITLES = {
  messages: 'View and reply to recruiter messages',
  profile: 'Manage your profile, education, and experience',
  interviews: 'Track shortlisted, rejected, hired, and interview updates',
  alerts: 'Saved searches — run them anytime from here',
  saved: 'Jobs you bookmarked for later',
  applications: 'Every job you have applied to, newest first',
};

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function filterByAppliedDate(list, dateKey) {
  if (!dateKey) return list;
  const today = startOfDay(new Date());
  let cutoff = today;
  if (dateKey === '3days') cutoff = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
  if (dateKey === 'week') cutoff = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
  return list.filter((app) => startOfDay(app.createdAt) >= cutoff);
}

function filterByStatus(list, statusKey) {
  if (statusKey === 'ALL') {
    return list.filter((app) => ['SHORTLISTED', 'REJECTED', 'HIRED', 'INTERVIEW_SCHEDULED'].includes(app.status));
  }
  return list.filter((app) => app.status === statusKey);
}

function interviewForApplication(interviews, applicationId) {
  return interviews.find((iv) => iv.applicationId === applicationId);
}

function alertToJobsUrl(alert) {
  const q = new URLSearchParams();
  if (alert.search) q.set('search', alert.search);
  if (alert.location) q.set('location', alert.location);
  if (alert.jobType) q.set('jobType', alert.jobType);
  if (alert.experienceLevel) q.set('experienceLevel', alert.experienceLevel);
  if (alert.category) q.set('category', alert.category);
  if (alert.minSalary) q.set('minSalary', String(alert.minSalary));
  if (alert.postedWithin) q.set('postedWithin', alert.postedWithin);
  if (alert.sort) q.set('sort', alert.sort);
  return `/jobs?${q}`;
}

function JobTitleLink({ app }) {
  if (app.status === 'JOB_REMOVED') {
    return (
      <p className="font-semibold">
        {app.jobTitle} <span className="text-xs font-normal text-muted-foreground">(listing removed)</span>
      </p>
    );
  }
  return <Link to={`/jobs/${app.jobId}`} className="font-semibold transition-colors hover:text-primary">{app.jobTitle}</Link>;
}

function FilterPill({ active, onClick, children }) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? 'default' : 'secondary'}
      aria-pressed={active}
      onClick={onClick}
      className="rounded-full px-4"
    >
      {children}
    </Button>
  );
}

function ViewButton({ id }) {
  return (
    <Button asChild variant="outline" size="sm">
      <Link to={`/applications/${id}`}><Eye /> View</Link>
    </Button>
  );
}

function fetchDashboard() {
  return Promise.allSettled([
    api.get('/api/applications/me'),
    api.get('/api/saved-jobs'),
    api.get('/api/jobs/recommended'),
    api.get('/api/applications/interviews/me'),
    api.get('/api/saved-searches'),
  ]);
}

function settledValue(result, fallback) {
  return result.status === 'fulfilled' ? unwrap(result.value) ?? fallback : fallback;
}

const SECTION_NAMES = ['applications', 'saved jobs', 'recommendations', 'interviews', 'job alerts'];

export default function CandidateDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'applications';
  const [applications, setApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failedSections, setFailedSections] = useState([]);
  const [togglingAlert, setTogglingAlert] = useState(null);
  const [appDateFilter, setAppDateFilter] = useState(null);
  const [interviewStatusFilter, setInterviewStatusFilter] = useState('ALL');

  const filteredApplications = filterByAppliedDate(applications, appDateFilter);
  const filteredInterviewApplications = filterByStatus(applications, interviewStatusFilter);

  const switchTab = (key) => {
    setSearchParams(key === 'applications' ? {} : { tab: key });
  };

  const applyResults = useCallback((results) => {
    const [apps, saved, rec, ints, alerts] = results;
    setApplications(settledValue(apps, []));
    setSavedJobs(settledValue(saved, []));
    setRecommended(settledValue(rec, []));
    setInterviews(settledValue(ints, []));
    setSavedSearches(settledValue(alerts, []));
    setFailedSections(SECTION_NAMES.filter((_, i) => results[i].status === 'rejected'));
    setLoading(false);
  }, []);

  const load = useCallback(() => fetchDashboard().then(applyResults), [applyResults]);

  useEffect(() => {
    fetchDashboard().then(applyResults);
  }, [applyResults]);

  const withdraw = async (id) => {
    try {
      await api.delete(`/api/applications/${id}`);
      toast.success('Application withdrawn');
      load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to withdraw application'));
    }
  };

  const toggleAlert = async (alert, alertsEnabled) => {
    setTogglingAlert(alert.id);
    try {
      await api.patch(`/api/saved-searches/${alert.id}`, { alertsEnabled });
      setSavedSearches((prev) => prev.map((a) => (a.id === alert.id ? { ...a, alertsEnabled } : a)));
      toast.success(alertsEnabled ? 'Notifications turned on for this alert' : 'Notifications paused for this alert');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not update the alert'));
    } finally {
      setTogglingAlert(null);
    }
  };

  const deleteAlert = async (id) => {
    try {
      await api.delete(`/api/saved-searches/${id}`);
      setSavedSearches((prev) => prev.filter((a) => a.id !== id));
      toast.success('Job alert removed');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to remove alert'));
    }
  };

  const unsaveJob = async (jobId) => {
    try {
      await api.delete(`/api/saved-jobs/${jobId}`);
      setSavedJobs((prev) => prev.filter((j) => j.id !== jobId));
      toast.success('Removed from saved');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to remove job'));
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  const pageTitle = tab === 'messages' ? 'Messages' : tab === 'profile' ? 'Profile' : 'My Dashboard';
  const pageSubtitle = PAGE_SUBTITLES[tab] || 'Track your applications and saved jobs';
  const tabCounts = {
    applications: applications.length,
    saved: savedJobs.length,
    interviews: filterByStatus(applications, 'ALL').length,
    alerts: savedSearches.length,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold">{pageTitle}</h1>
      <p className="mt-1 text-muted-foreground">{pageSubtitle}</p>

      {!NAV_ONLY_TABS.includes(tab) && (
        <Tabs value={tab} onValueChange={switchTab} className="mt-6">
          <div className="-mx-4 overflow-x-auto overflow-y-hidden px-4 py-1 sm:mx-0 sm:px-0">
            <TabsList className="w-max">
              {DASHBOARD_TABS.map(({ key, label, icon: Icon }) => (
                <TabsTrigger key={key} value={key} className="flex-none px-3">
                  <Icon />
                  {label}
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-[11px]">{tabCounts[key]}</Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      )}

      {failedSections.length > 0 && !NAV_ONLY_TABS.includes(tab) && (
        <div role="alert" className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="size-4 shrink-0" />
          <p className="flex-1">Could not load your {failedSections.join(', ')}. What you see may be incomplete.</p>
          <Button type="button" size="sm" variant="outline" onClick={load}><RefreshCw /> Retry</Button>
        </div>
      )}

      {tab === 'applications' && recommended.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">Recommended for you</h2>
          <p className="text-sm text-muted-foreground">Jobs matching your profile skills</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recommended.slice(0, 3).map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        </div>
      )}

      {tab === 'applications' && (
        <div className="mt-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {APPLICATION_DATE_FILTERS.map(({ key, label }) => (
              <FilterPill
                key={key}
                active={appDateFilter === key}
                onClick={() => setAppDateFilter((current) => (current === key ? null : key))}
              >
                {label}
                <span className="opacity-75">({filterByAppliedDate(applications, key).length})</span>
              </FilterPill>
            ))}
            {appDateFilter && (
              <Button type="button" variant="link" size="sm" onClick={() => setAppDateFilter(null)} className="text-muted-foreground">
                Show all
              </Button>
            )}
          </div>

          {applications.length === 0 ? (
            <EmptyState icon={FileText} title="No applications yet" description="Find a role you like and apply in one click." actionLabel="Browse jobs" actionTo="/jobs" />
          ) : filteredApplications.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={`No applications ${APPLICATION_DATE_FILTERS.find((f) => f.key === appDateFilter)?.label?.toLowerCase() || 'in this period'}`}
              actionLabel="Show all"
              onAction={() => setAppDateFilter(null)}
            />
          ) : (
            <div className="space-y-4">
              {filteredApplications.map((app) => (
                <Card key={app.id} className="flex-row flex-wrap items-center justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <JobTitleLink app={app} />
                    <p className="text-sm text-muted-foreground">{app.company}</p>
                    {app.matchScore != null && (
                      <Badge className={cn('mt-1', matchScoreClass(app.matchScore))}>{app.matchScore}% match</Badge>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">Applied {new Date(app.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <ViewButton id={app.id} />
                    <StatusBadge status={app.status} />
                    {WITHDRAWABLE_STATUSES.includes(app.status) && (
                      <ConfirmDialog
                        trigger={<Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">Withdraw</Button>}
                        title="Withdraw application?"
                        description={`Your application for ${app.jobTitle} at ${app.company} will be withdrawn. You can apply again later.`}
                        confirmLabel="Withdraw"
                        destructive
                        onConfirm={() => withdraw(app.id)}
                      />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'saved' && (
        <div className="mt-8">
          {savedJobs.length === 0 ? (
            <EmptyState icon={Bookmark} title="No saved jobs yet" description="Bookmark jobs while browsing to come back to them later." actionLabel="Browse jobs" actionTo="/jobs" />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {savedJobs.map((job) => (
                <JobCard key={job.id} job={{ ...job, saved: true }} onSave={() => {}} onUnsave={unsaveJob} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'interviews' && (
        <div className="mt-8 space-y-4">
          <div className="flex flex-wrap gap-2">
            {INTERVIEW_STATUS_FILTERS.map(({ key, label }) => (
              <FilterPill key={key} active={interviewStatusFilter === key} onClick={() => setInterviewStatusFilter(key)}>
                {label}
                {key !== 'ALL' && (
                  <span className="opacity-75">({applications.filter((a) => a.status === key).length})</span>
                )}
              </FilterPill>
            ))}
          </div>

          {filteredInterviewApplications.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title={interviewStatusFilter === 'ALL' ? 'No updates from recruiters yet' : 'Nothing here'}
              description={interviewStatusFilter === 'ALL'
                ? 'Keep applying — shortlisted, interview, and hiring updates will appear here.'
                : `No applications with status "${INTERVIEW_STATUS_FILTERS.find((f) => f.key === interviewStatusFilter)?.label}".`}
            />
          ) : (
            filteredInterviewApplications.map((app) => {
              const iv = interviewForApplication(interviews, app.id);
              return (
                <Card key={app.id} className="flex-row flex-wrap items-start justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <JobTitleLink app={app} />
                    <p className="text-sm text-muted-foreground">{app.company}</p>
                    {iv && (
                      <p className="mt-2 flex items-center gap-1 text-sm">
                        <Calendar className="size-4 text-primary" />
                        {new Date(iv.scheduledAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    )}
                    {iv?.location && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="size-4" />{iv.location}
                      </p>
                    )}
                    {iv?.notes && <p className="mt-2 text-sm text-muted-foreground">{iv.notes}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">Applied {new Date(app.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <ViewButton id={app.id} />
                    <StatusBadge status={app.status} />
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {tab === 'alerts' && (
        <div className="mt-8 space-y-4">
          {savedSearches.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No job alerts yet"
              description='Search jobs and use "Save job alert" in the filters to get notified about matches.'
              actionLabel="Search jobs"
              actionTo="/jobs"
            />
          ) : (
            savedSearches.map((alert) => (
              <Card key={alert.id} className="flex-row flex-wrap items-center justify-between gap-4 p-5">
                <div className="min-w-0">
                  <p className="font-semibold">{alert.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{pluralize(alert.matchCount, 'matching open job')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`alert-notify-${alert.id}`}
                      checked={alert.alertsEnabled !== false}
                      disabled={togglingAlert === alert.id}
                      onCheckedChange={(checked) => toggleAlert(alert, checked)}
                    />
                    <Label htmlFor={`alert-notify-${alert.id}`} className="text-sm font-normal text-muted-foreground">
                      Notify me
                    </Label>
                  </div>
                  <Button asChild size="sm">
                    <Link to={alertToJobsUrl(alert)}>View jobs</Link>
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" aria-label="Delete alert">
                        <Trash2 />
                      </Button>
                    }
                    title="Delete job alert?"
                    description={`"${alert.name}" will be removed.`}
                    confirmLabel="Delete"
                    destructive
                    onConfirm={() => deleteAlert(alert.id)}
                  />
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'messages' && (
        <div className="mt-8">
          <ChatPanel embedded onUnreadChange={notifyCountsChanged} />
        </div>
      )}

      {tab === 'profile' && (
        <div className="mt-8">
          <ProfilePanel />
        </div>
      )}
    </div>
  );
}
