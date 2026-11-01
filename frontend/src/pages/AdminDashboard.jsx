import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { chartAxisProps, chartTooltipProps } from '@/lib/chart';
import { cn } from '@/lib/utils';
import api, { unwrap } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ApplicantStatusChart from '../components/ApplicantStatusChart';
import ChatPanel from '../components/ChatPanel';
import ProfilePanel from '../components/ProfilePanel';
import EmptyState from '../components/common/EmptyState';
import StatusBadge from '../components/common/StatusBadge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import SelectField from '../components/common/SelectField';
import { daysAgo, formatSalary } from '../utils/formatters';
import { isLegacyCompanyName, resolveRecruiterCompany } from '../utils/recruiterCompany';
import { buildAiDefaults, scrubGlobalcoFromDescription, EXPERIENCE_LEVELS } from '../utils/jobFormDefaults';
import { STATUS_CHART_COLORS, formatStatus } from '../utils/applicationStatus';

const QUICK_STATUSES = ['SHORTLISTED', 'REJECTED', 'INTERVIEW_SCHEDULED', 'HIRED'];

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

export default function AdminDashboard() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';
  const [dashboard, setDashboard] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [aiForm, setAiForm] = useState(() => buildAiDefaults(user));
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [jobFilter, setJobFilter] = useState('');

  const profileKey = `${user?.companyName ?? ''}|${user?.location ?? ''}`;
  const [prevProfileKey, setPrevProfileKey] = useState(profileKey);
  if (user && profileKey !== prevProfileKey) {
    setPrevProfileKey(profileKey);
    setAiForm((prev) => ({
      ...prev,
      company: resolveRecruiterCompany(user, prev.company),
      location: user.location?.trim() || prev.location,
    }));
  }

  const load = useCallback(async () => {
    const [dash, apps, jobList] = await Promise.allSettled([
      api.get('/api/admin/dashboard'),
      api.get('/api/admin/applicants'),
      api.get('/api/admin/jobs'),
    ]);
    if (dash.status === 'fulfilled') setDashboard(unwrap(dash.value));
    if (apps.status === 'fulfilled') setApplicants(unwrap(apps.value) || []);
    if (jobList.status === 'fulfilled') setJobs(unwrap(jobList.value) || []);
    if ([dash, apps, jobList].some((r) => r.status === 'rejected')) {
      toast.error('Some dashboard data failed to load');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    Promise.resolve(refreshUser?.()).catch(() => {}).finally(load);
  }, [refreshUser, load]);

  const switchTab = (key) => {
    setSearchParams(key === 'overview' ? {} : { tab: key });
  };

  const deleteJob = async (id) => {
    try {
      await api.delete(`/api/jobs/${id}`);
      toast.success('Job deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete job');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/api/applications/${id}/status`, { status });
      setApplicants((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      toast.success(`Status updated to ${formatStatus(status)}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const generateDescription = async () => {
    if (!aiForm.jobTitle?.trim() || !aiForm.skills?.trim()) {
      return toast.error('Job title and skills are required');
    }
    const company = resolveRecruiterCompany(user, aiForm.company);
    if (!company) {
      return toast.error('Set Company Name in Profile (Admin → Profile), then try again');
    }
    setGenerating(true);
    try {
      const res = await api.post('/api/ai/generate-job-description', { ...aiForm, company });
      const description = unwrap(res).description;
      navigate('/admin/jobs/new', {
        state: {
          jobForm: {
            title: aiForm.jobTitle,
            skills: aiForm.skills,
            company,
            location: aiForm.location || user?.location?.trim() || '',
            experienceLevel: aiForm.experienceLevel || 'Mid-Level',
            description: scrubGlobalcoFromDescription(description, company),
            jobType: 'Full-time',
            category: 'Engineering',
            salaryMin: '',
            salaryMax: '',
            featured: false,
          },
        },
      });
      toast.success('AI description generated — review and publish your job');
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const syncCompanyFromProfile = async () => {
    try {
      const fresh = await refreshUser();
      const company = resolveRecruiterCompany(fresh, '');
      if (!company) {
        return toast.error('Update Company Name in your Profile (e.g. XPO)');
      }
      setAiForm((f) => ({ ...f, company, location: fresh.location?.trim() || f.location }));
      toast.success(`Company set to ${company}`);
    } catch {
      toast.error('Could not load your profile');
    }
  };

  const profileCompanyMissing = user && isLegacyCompanyName(user.companyName);

  const filteredApplicants = applicants.filter((app) => {
    const matchesJob = !jobFilter || String(app.jobId) === jobFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q
      || app.userName?.toLowerCase().includes(q)
      || app.userEmail?.toLowerCase().includes(q)
      || app.jobTitle?.toLowerCase().includes(q);
    return matchesJob && matchesSearch;
  });

  if (loading) return <LoadingSpinner fullScreen />;

  const categoryData = Object.entries(dashboard?.jobsByCategory || {}).map(([name, value]) => ({ name, value }));
  const statusData = Object.entries(dashboard?.applicationsByStatus || {}).map(([name, value]) => ({ name, value }));
  const pageTitle = tab === 'messages' ? 'Messages' : tab === 'profile' ? 'Profile' : 'Admin Dashboard';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold">{pageTitle}</h1>

      {!NAV_ONLY_TABS.includes(tab) && (
        <Tabs value={tab} onValueChange={switchTab} className="mt-6">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 sm:w-fit">
            {DASHBOARD_TABS.map(({ key, label, icon: Icon }) => (
              <TabsTrigger key={key} value={key} className="h-9 flex-none px-3">
                <Icon /> {label}
              </TabsTrigger>
            ))}
          </TabsList>
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
          {categoryData.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Jobs by Category</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={categoryData}>
                    <XAxis dataKey="name" {...chartAxisProps} />
                    <YAxis allowDecimals={false} {...chartAxisProps} />
                    <Tooltip {...chartTooltipProps} />
                    <Bar dataKey="value" name="Jobs" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          {statusData.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Applications by Status</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      stroke="var(--card)"
                      label={({ name, value }) => `${formatStatus(name)}: ${value}`}
                    >
                      {statusData.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_CHART_COLORS[entry.name] || '#64748b'} />
                      ))}
                    </Pie>
                    <Tooltip {...chartTooltipProps} formatter={(value, name) => [value, formatStatus(name)]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
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
                        {job.status}
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
                      description={`"${job.title}" and its listing will be permanently removed.`}
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
        <div className="mt-8 space-y-8">
          <ApplicantStatusChart />

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or job title..."
                aria-label="Search applicants"
                className="h-10 pl-10"
              />
            </div>
            <SelectField
              value={jobFilter}
              onValueChange={setJobFilter}
              options={jobs.map((j) => ({ value: String(j.id), label: j.title }))}
              emptyLabel="All Jobs"
              aria-label="Filter by job"
              className="h-10 sm:w-64"
            />
          </div>

          <div className="space-y-4">
            {filteredApplicants.length === 0 ? (
              <EmptyState icon={Users} title="No applications found" description={searchQuery || jobFilter ? 'Try a different search or job filter.' : 'Applications to your jobs will appear here.'} />
            ) : (
              filteredApplicants.map((app) => (
                <Card key={app.id} className="gap-0 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-lg font-semibold">{app.userName}</p>
                        <StatusBadge status={app.status} className="py-0.5" />
                        {app.matchScore != null && (
                          <Badge className="bg-emerald-100 px-3 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
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
                      <Link to={`/admin/applicants/${app.id}`}><Eye /> View Application</Link>
                    </Button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
                    <span className="mr-1 text-xs text-muted-foreground">Quick actions:</span>
                    {QUICK_STATUSES.map((s) => (
                      <Button
                        key={s}
                        type="button"
                        variant="outline"
                        size="xs"
                        disabled={app.status === s || app.status === 'WITHDRAWN'}
                        onClick={() => updateStatus(app.id, s)}
                      >
                        {formatStatus(s)}
                      </Button>
                    ))}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      <div className={tab === 'messages' ? 'mt-8 overflow-hidden' : 'hidden'} aria-hidden={tab !== 'messages'}>
        <ChatPanel embedded onUnreadChange={() => {}} />
      </div>

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
                <Input id="ai-title" placeholder="e.g. Java Full Stack Developer" value={aiForm.jobTitle} onChange={(e) => setAiForm({ ...aiForm, jobTitle: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="ai-company">Company <span className="text-destructive">*</span></Label>
                  <Button type="button" variant="link" size="sm" className="h-auto px-0 text-xs" onClick={syncCompanyFromProfile}>
                    Sync from profile
                  </Button>
                </div>
                <Input id="ai-company" placeholder="Your company name" value={aiForm.company} onChange={(e) => setAiForm({ ...aiForm, company: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-location">Location</Label>
                <Input id="ai-location" placeholder="Hyderabad / Remote" value={aiForm.location} onChange={(e) => setAiForm({ ...aiForm, location: e.target.value })} />
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
                <Input id="ai-skills" placeholder="Java, Spring Boot, React" value={aiForm.skills} onChange={(e) => setAiForm({ ...aiForm, skills: e.target.value })} required />
              </div>
              <Button type="submit" disabled={generating}>
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
