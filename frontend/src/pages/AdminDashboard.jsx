import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api, { unwrap } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ApplicantStatusChart from '../components/ApplicantStatusChart';
import ChatPanel from '../components/ChatPanel';
import ProfilePanel from '../components/ProfilePanel';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';
import {
  Sparkles, Eye, Search, Plus, Pencil, Trash2, Briefcase,
  MapPin, Building2, IndianRupee, LayoutDashboard, Users, ExternalLink,
} from 'lucide-react';
import { daysAgo, formatSalary } from '../utils/formatters';
import { isLegacyCompanyName, resolveRecruiterCompany } from '../utils/recruiterCompany';
import {
  buildAiDefaults,
  scrubGlobalcoFromDescription,
  EXPERIENCE_LEVELS,
} from '../utils/jobFormDefaults';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  SHORTLISTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  INTERVIEW_SCHEDULED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  HIRED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

const DASHBOARD_TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'jobs', label: 'Jobs', icon: Briefcase },
  { key: 'applicants', label: 'Applicants', icon: Users },
  { key: 'ai', label: 'AI Generator', icon: Sparkles },
];

const NAV_ONLY_TABS = ['messages', 'profile'];

export default function AdminDashboard() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dashboard, setDashboard] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [tab, setTab] = useState(searchParams.get('tab') || 'overview');
  const [aiForm, setAiForm] = useState(() => buildAiDefaults(user));
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [jobFilter, setJobFilter] = useState('');

  const load = async () => {
    const [dash, apps, jobList] = await Promise.all([
      api.get('/api/admin/dashboard'),
      api.get('/api/admin/applicants'),
      api.get('/api/admin/jobs'),
    ]);
    setDashboard(unwrap(dash));
    setApplicants(unwrap(apps));
    setJobs(unwrap(jobList));
    setLoading(false);
  };

  useEffect(() => {
    refreshUser?.().finally(() => load());
  }, []);

  useEffect(() => {
    if (!user) return;
    const company = resolveRecruiterCompany(user, aiForm.company);
    const location = user.location?.trim() || aiForm.location || '';
    setAiForm((prev) => ({ ...prev, company, location: location || prev.location }));
  }, [user?.companyName, user?.location]);

  const switchTab = (key, extra = {}) => {
    setTab(key);
    const params = key === 'overview' ? {} : { tab: key, ...extra };
    setSearchParams(params);
  };

  useEffect(() => {
    const t = searchParams.get('tab') || 'overview';
    setTab(t);
  }, [searchParams]);

  const deleteJob = async (id) => {
    if (!confirm('Delete this job posting?')) return;
    await api.delete(`/api/jobs/${id}`);
    toast.success('Job deleted');
    load();
  };

  const updateStatus = async (id, status) => {
    await api.patch(`/api/applications/${id}/status`, { status });
    toast.success(`Status updated to ${status.replace('_', ' ')}`);
    load();
  };

  const generateDescription = async () => {
    if (!aiForm.jobTitle?.trim() || !aiForm.skills?.trim()) {
      return toast.error('Job title and skills are required');
    }
    const company = resolveRecruiterCompany(user, aiForm.company);
    if (!company) {
      return toast.error('Set Company Name in Profile (Admin → Profile), then try again');
    }
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
    }
  };

  const syncCompanyFromProfile = async () => {
    const fresh = await refreshUser();
    const company = resolveRecruiterCompany(fresh, '');
    if (!company) {
      return toast.error('Update Company Name in your Profile (e.g. XPO)');
    }
    setAiForm((f) => ({ ...f, company, location: fresh.location?.trim() || f.location }));
    toast.success(`Company set to ${company}`);
  };

  const profileCompanyMissing = user && isLegacyCompanyName(user.companyName);

  const filteredApplicants = applicants.filter((app) => {
    const matchesJob = !jobFilter || String(app.jobId) === jobFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q
      || app.userName?.toLowerCase().includes(q)
      || app.userEmail?.toLowerCase().includes(q)
      || app.jobTitle?.toLowerCase().includes(q);
    return matchesJob && matchesSearch;
  });

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;

  const categoryData = Object.entries(dashboard.jobsByCategory || {}).map(([name, value]) => ({ name, value }));
  const pageTitle = tab === 'messages' ? 'Messages' : tab === 'profile' ? 'Profile' : 'Admin Dashboard';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold">{pageTitle}</h1>

      {!NAV_ONLY_TABS.includes(tab) && (
        <div className="mt-6 flex flex-wrap gap-2">
          {DASHBOARD_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => switchTab(key)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                tab === key ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      )}

      {tab === 'overview' && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-semibold">Jobs Overview</h2>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-primary-50 p-4 dark:bg-primary-900/20">
                <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">{dashboard.totalJobs}</p>
                <p className="text-sm text-slate-500">Total Jobs</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-900/20">
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{dashboard.openJobs}</p>
                <p className="text-sm text-slate-500">Open Positions</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-semibold">Applications</h2>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-purple-50 p-4 dark:bg-purple-900/20">
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{dashboard.totalApplications}</p>
                <p className="text-sm text-slate-500">Total Applications</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-4 dark:bg-amber-900/20">
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{dashboard.pendingApplications}</p>
                <p className="text-sm text-slate-500">Pending Review</p>
              </div>
            </div>
          </div>
          {categoryData.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-semibold">Jobs by Category</h2>
              <ResponsiveContainer width="100%" height={250} className="mt-4">
                <BarChart data={categoryData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {dashboard.applicationsByStatus && Object.keys(dashboard.applicationsByStatus).length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-semibold">Applications by Status</h2>
              <ResponsiveContainer width="100%" height={250} className="mt-4">
                <PieChart>
                  <Pie
                    data={Object.entries(dashboard.applicationsByStatus).map(([name, value]) => ({ name, value }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {Object.keys(dashboard.applicationsByStatus).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {tab === 'jobs' && (
        <div className="mt-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Your Job Listings</h2>
              <p className="text-sm text-slate-500">Create, edit, and manage job postings on dedicated pages</p>
            </div>
            <Link
              to="/admin/jobs/new"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> Post New Job
            </Link>
          </div>

          {jobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
              <p className="text-slate-500">No jobs posted yet.</p>
              <Link to="/admin/jobs/new" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:underline">
                <Plus className="h-4 w-4" /> Create your first listing
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <div key={job.id} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                  <p className="font-semibold leading-tight">{job.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <Building2 className="h-3 w-3" />{job.company}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                    <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />{formatSalary(job.salaryMin, job.salaryMax)}</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${job.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {job.status}
                    </span>
                    {job.featured && <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-medium text-primary-700">Featured</span>}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 py-2 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> View
                    </Link>
                    <Link
                      to={`/admin/jobs/${job.id}/edit`}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-100 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => deleteJob(job.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100 dark:bg-red-950/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
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
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or job title..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">All Jobs</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>

          <div className="space-y-4">
            {filteredApplicants.length === 0 ? (
              <p className="py-12 text-center text-slate-500">No applications found.</p>
            ) : (
              filteredApplicants.map((app) => (
                <div key={app.id} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-lg font-semibold">{app.userName}</p>
                        <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${statusColors[app.status] || statusColors.PENDING}`}>
                          {app.status.replace('_', ' ')}
                        </span>
                        {app.matchScore != null && (
                          <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            {app.matchScore}% match
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {app.recruiterViewed ? app.userEmail : 'View application to reveal contact details'}
                      </p>
                      <p className="mt-1 text-sm"><strong>Applied for:</strong> {app.jobTitle} · {app.company}</p>
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                        {app.userLocation && <span>📍 {app.userLocation}</span>}
                        <span>Applied {daysAgo(app.createdAt)}</span>
                      </div>
                      {app.coverLetter && (
                        <p className="mt-2 line-clamp-2 text-sm italic text-slate-500">"{app.coverLetter}"</p>
                      )}
                    </div>

                    <Link
                      to={`/admin/applicants/${app.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                    >
                      <Eye className="h-4 w-4" /> View Application
                    </Link>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <span className="mr-1 self-center text-xs text-slate-400">Quick actions:</span>
                    {['SHORTLISTED', 'REJECTED', 'INTERVIEW_SCHEDULED', 'HIRED'].map((s) => (
                      <button key={s} type="button" onClick={() => updateStatus(app.id, s)} className="rounded-lg border px-3 py-1 text-xs hover:bg-slate-50 dark:hover:bg-slate-800">
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
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

      {profileCompanyMissing && tab !== 'profile' && (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          Your profile still has a placeholder company name. Go to{' '}
          <Link to="/admin?tab=profile" className="font-semibold underline">Profile</Link>
          {' '}and set <strong>Company Name</strong> to your real company before posting jobs.
        </div>
      )}

      {tab === 'ai' && (
        <div className="mt-8 max-w-xl rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary-600" />
            <h2 className="font-semibold">AI Job Description Generator</h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Descriptions use your recruiting company from your profile. Generated content opens on the new job page.
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-500">Job title *</label>
              <input placeholder="e.g. Java Full Stack Developer" value={aiForm.jobTitle} onChange={(e) => setAiForm({ ...aiForm, jobTitle: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800" required />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-slate-500">Company *</label>
                <button type="button" onClick={syncCompanyFromProfile} className="text-xs font-medium text-primary-600 hover:underline">
                  Sync from profile
                </button>
              </div>
              <input placeholder="Your company name" value={aiForm.company} onChange={(e) => setAiForm({ ...aiForm, company: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800" required />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Location</label>
              <input placeholder="Hyderabad / Remote" value={aiForm.location} onChange={(e) => setAiForm({ ...aiForm, location: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Experience level</label>
              <select value={aiForm.experienceLevel} onChange={(e) => setAiForm({ ...aiForm, experienceLevel: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                {EXPERIENCE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Skills (comma separated) *</label>
              <input placeholder="Java, Spring Boot, React" value={aiForm.skills} onChange={(e) => setAiForm({ ...aiForm, skills: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800" required />
            </div>
            <button type="button" onClick={generateDescription} className="rounded-lg bg-primary-600 px-6 py-2 font-medium text-white hover:bg-primary-700">
              Generate &amp; Open Job Form
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
