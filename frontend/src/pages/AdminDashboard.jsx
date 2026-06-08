import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { unwrap } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ApplicationDetailModal from '../components/ApplicationDetailModal';
import ApplicantStatusChart from '../components/ApplicantStatusChart';
import ResumeViewer from '../components/ResumeViewer';
import ChatPanel from '../components/ChatPanel';
import ProfilePanel from '../components/ProfilePanel';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';
import {
  Sparkles, Eye, Search, Plus, Pencil, Trash2, X, Briefcase,
  MapPin, Building2, IndianRupee, LayoutDashboard, Users,
} from 'lucide-react';
import { daysAgo, formatSalary } from '../utils/formatters';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

function buildJobDefaults(user) {
  return {
    title: '',
    company: user?.companyName?.trim() || '',
    description: '',
    location: user?.location?.trim() || '',
    salaryMin: '',
    salaryMax: '',
    experienceLevel: 'Mid-Level',
    jobType: 'Full-time',
    category: 'Engineering',
    skills: '',
    featured: false,
  };
}

function buildAiDefaults(user) {
  return {
    jobTitle: '',
    skills: '',
    company: user?.companyName?.trim() || '',
    location: user?.location?.trim() || '',
    experienceLevel: 'Mid-Level',
  };
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  SHORTLISTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  INTERVIEW_SCHEDULED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  HIRED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Remote', 'Internship'];
const CATEGORIES = ['Engineering', 'Design', 'Marketing', 'Sales', 'Finance', 'HR', 'Operations', 'Data Science'];
const EXPERIENCE_LEVELS = ['Entry', 'Mid-Level', 'Senior', 'Lead'];

const DASHBOARD_TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'jobs', label: 'Jobs', icon: Briefcase },
  { key: 'applicants', label: 'Applicants', icon: Users },
  { key: 'ai', label: 'AI Generator', icon: Sparkles },
];

const NAV_ONLY_TABS = ['messages', 'profile'];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dashboard, setDashboard] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [tab, setTab] = useState(searchParams.get('tab') || 'overview');
  const [jobForm, setJobForm] = useState(() => buildJobDefaults(user));
  const [editingId, setEditingId] = useState(null);
  const [aiForm, setAiForm] = useState(() => buildAiDefaults(user));
  const [loading, setLoading] = useState(true);
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [jobFilter, setJobFilter] = useState('');
  const [previewResumeApp, setPreviewResumeApp] = useState(null);

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

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!user || editingId) return;
    setJobForm((prev) => ({
      ...prev,
      company: prev.company || user.companyName?.trim() || '',
      location: prev.location || user.location?.trim() || '',
    }));
    setAiForm((prev) => ({
      ...prev,
      company: prev.company || user.companyName?.trim() || '',
      location: prev.location || user.location?.trim() || '',
    }));
  }, [user, editingId]);

  const switchTab = (key, extra = {}) => {
    setTab(key);
    const params = key === 'overview' ? {} : { tab: key, ...extra };
    setSearchParams(params);
  };

  useEffect(() => {
    const t = searchParams.get('tab') || 'overview';
    setTab(t);
  }, [searchParams]);

  const startNewJob = useCallback(() => {
    setEditingId(null);
    setJobForm(buildJobDefaults(user));
  }, [user]);

  const saveJob = async (e) => {
    e.preventDefault();
    const payload = {
      ...jobForm,
      salaryMin: jobForm.salaryMin ? Number(jobForm.salaryMin) : null,
      salaryMax: jobForm.salaryMax ? Number(jobForm.salaryMax) : null,
    };
    try {
      if (editingId) {
        await api.put(`/api/jobs/${editingId}`, payload);
        toast.success('Job updated successfully');
      } else {
        await api.post('/api/jobs', payload);
        toast.success('New job posted successfully');
      }
      startNewJob();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save job');
    }
  };

  const editJob = (job) => {
    setEditingId(job.id);
    setJobForm({
      title: job.title, company: job.company, description: job.description, location: job.location,
      salaryMin: job.salaryMin || '', salaryMax: job.salaryMax || '', experienceLevel: job.experienceLevel || '',
      jobType: job.jobType, category: job.category || '', skills: job.skills || '', featured: job.featured,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteJob = async (id) => {
    if (!confirm('Delete this job posting?')) return;
    await api.delete(`/api/jobs/${id}`);
    toast.success('Job deleted');
    if (editingId === id) startNewJob();
    load();
  };

  const updateStatus = async (id, status) => {
    await api.patch(`/api/applications/${id}/status`, { status });
    toast.success(`Status updated to ${status}`);
    setSelectedAppId(null);
    load();
  };

  const generateDescription = async () => {
    if (!aiForm.jobTitle?.trim() || !aiForm.skills?.trim()) {
      return toast.error('Job title and skills are required');
    }
    if (!aiForm.company?.trim()) {
      return toast.error('Company name is required — set it in Profile or the field below');
    }
    try {
      const res = await api.post('/api/ai/generate-job-description', aiForm);
      setJobForm((f) => ({
        ...f,
        title: aiForm.jobTitle,
        skills: aiForm.skills,
        company: aiForm.company,
        location: aiForm.location || f.location,
        experienceLevel: aiForm.experienceLevel || f.experienceLevel,
        description: unwrap(res).description,
      }));
      switchTab('jobs');
      toast.success('AI description generated with your company name!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI generation failed');
    }
  };

  const syncCompanyFromProfile = () => {
    if (!user?.companyName?.trim()) {
      return toast.error('Add your company name in Profile first');
    }
    setJobForm((f) => ({ ...f, company: user.companyName.trim(), location: user.location?.trim() || f.location }));
    setAiForm((f) => ({ ...f, company: user.companyName.trim(), location: user.location?.trim() || f.location }));
    toast.success('Company synced from profile');
  };

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
  const editingJob = jobs.find((j) => j.id === editingId);

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
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                tab === key
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {key === 'applicants' && <span className="opacity-75">({applicants.length})</span>}
              {key === 'jobs' && <span className="opacity-75">({jobs.length})</span>}
            </button>
          ))}
        </div>
      )}

      {tab === 'overview' && (
        <div className="mt-8 space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total Jobs', value: dashboard.totalJobs },
              { label: 'Open Jobs', value: dashboard.openJobs },
              { label: 'Applications', value: dashboard.totalApplications },
              { label: 'Unique Candidates', value: dashboard.totalUsers },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-3xl font-bold">{s.value}</p>
                <p className="text-sm text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>

          <ApplicantStatusChart />

          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-semibold">Jobs by Category</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'jobs' && (
        <div className="mt-8">
          {/* Mode banner */}
          <div className={`mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 p-4 ${
            editingId
              ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30'
              : 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30'
          }`}>
            <div className="flex items-center gap-3">
              {editingId ? (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-800">
                    <Pencil className="h-5 w-5 text-amber-800 dark:text-amber-200" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-900 dark:text-amber-200">Editing Existing Job</p>
                    <p className="text-sm text-amber-700 dark:text-amber-400">{editingJob?.title || `Job #${editingId}`}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-200 dark:bg-emerald-800">
                    <Plus className="h-5 w-5 text-emerald-800 dark:text-emerald-200" />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-900 dark:text-emerald-200">Post a New Job</p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">Fill in the form below to create a new listing</p>
                  </div>
                </>
              )}
            </div>
            {editingId && (
              <button
                onClick={startNewJob}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-slate-900 dark:text-amber-300"
              >
                <X className="h-4 w-4" /> Cancel Edit — Post New Instead
              </button>
            )}
          </div>

          <div className="grid gap-8 xl:grid-cols-5">
            {/* Job form */}
            <form onSubmit={saveJob} className={`space-y-4 rounded-2xl border-2 bg-white p-6 xl:col-span-3 dark:bg-slate-900 ${
              editingId ? 'border-amber-200 dark:border-amber-800' : 'border-emerald-200 dark:border-emerald-800'
            }`}>
              <h2 className="text-lg font-semibold">
                {editingId ? '✏️ Edit Job Details' : '➕ New Job Posting Form'}
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Job Title *</label>
                  <input value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800" required placeholder="e.g. Senior Software Engineer" />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm font-medium">Company *</label>
                    <button type="button" onClick={syncCompanyFromProfile} className="text-xs font-medium text-primary-600 hover:underline">
                      Sync from profile
                    </button>
                  </div>
                  <input
                    value={jobForm.company}
                    onChange={(e) => setJobForm({ ...jobForm, company: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800"
                    required
                    placeholder="Your recruiting company (e.g. Xceed Technologies)"
                  />
                  {!jobForm.company && (
                    <p className="mt-1 text-xs text-amber-600">
                      Set company in <Link to="/admin?tab=profile" className="underline">Profile</Link> or enter it here
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Location *</label>
                  <input value={jobForm.location} onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800" required placeholder="Hyderabad / Remote" />
                </div>
                <div>
                  <label className="text-sm font-medium">Job Type *</label>
                  <select value={jobForm.jobType} onChange={(e) => setJobForm({ ...jobForm, jobType: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800" required>
                    {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <select value={jobForm.category} onChange={(e) => setJobForm({ ...jobForm, category: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Experience Level</label>
                  <select value={jobForm.experienceLevel} onChange={(e) => setJobForm({ ...jobForm, experienceLevel: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                    {EXPERIENCE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Min Salary (₹/year)</label>
                  <input type="number" value={jobForm.salaryMin} onChange={(e) => setJobForm({ ...jobForm, salaryMin: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800" placeholder="800000" />
                </div>
                <div>
                  <label className="text-sm font-medium">Max Salary (₹/year)</label>
                  <input type="number" value={jobForm.salaryMax} onChange={(e) => setJobForm({ ...jobForm, salaryMax: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800" placeholder="1500000" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Required Skills (comma separated)</label>
                <input value={jobForm.skills} onChange={(e) => setJobForm({ ...jobForm, skills: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800" placeholder="Java, React, MySQL" />
              </div>

              <div>
                <label className="text-sm font-medium">Job Description *</label>
                <textarea value={jobForm.description} onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })} rows={8} className="mt-1 w-full rounded-lg border px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800" required placeholder="Describe the role, responsibilities, and requirements..." />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={jobForm.featured} onChange={(e) => setJobForm({ ...jobForm, featured: e.target.checked })} className="rounded" />
                Mark as Featured Job
              </label>

              <div className="flex gap-3 pt-2">
                <button type="submit" className={`rounded-xl px-8 py-3 font-semibold text-white ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                  {editingId ? 'Save Changes' : 'Publish Job'}
                </button>
                {editingId && (
                  <button type="button" onClick={startNewJob} className="rounded-xl border px-6 py-3 font-medium hover:bg-slate-50 dark:hover:bg-slate-800">
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {/* Job list */}
            <div className="xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">Your Job Listings</h3>
                <button onClick={startNewJob} className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700">
                  <Plus className="h-3.5 w-3.5" /> New Job
                </button>
              </div>
              <div className="max-h-[700px] space-y-3 overflow-y-auto pr-1">
                {jobs.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No jobs posted yet. Use the form to create your first listing.</p>
                ) : (
                  jobs.map((job) => (
                    <div
                      key={job.id}
                      className={`rounded-xl border-2 p-4 transition ${
                        editingId === job.id
                          ? 'border-amber-400 bg-amber-50 shadow-md dark:border-amber-600 dark:bg-amber-950/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
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
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                        <button
                          onClick={() => editJob(job)}
                          className={`flex-1 inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium ${
                            editingId === job.id ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          <Pencil className="h-3.5 w-3.5" /> {editingId === job.id ? 'Editing...' : 'Edit'}
                        </button>
                        <button onClick={() => deleteJob(job.id)} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:bg-red-950/30">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
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

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setSelectedAppId(app.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                      >
                        <Eye className="h-4 w-4" /> View Application
                      </button>
                      {app.hasResume && (
                        <button
                          onClick={() => setPreviewResumeApp(app)}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                        >
                          <Briefcase className="h-4 w-4" /> View Resume
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <span className="mr-1 self-center text-xs text-slate-400">Quick actions:</span>
                    {['SHORTLISTED', 'REJECTED', 'INTERVIEW_SCHEDULED', 'HIRED'].map((s) => (
                      <button key={s} onClick={() => updateStatus(app.id, s)} className="rounded-lg border px-3 py-1 text-xs hover:bg-slate-50 dark:hover:bg-slate-800">
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

      {tab === 'ai' && (
        <div className="mt-8 max-w-xl rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary-600" />
            <h2 className="font-semibold">AI Job Description Generator</h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Descriptions use your recruiting company (not Globalco). Pre-filled from your profile.
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-500">Job title *</label>
              <input placeholder="e.g. Java Full Stack Developer" value={aiForm.jobTitle} onChange={(e) => setAiForm({ ...aiForm, jobTitle: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800" required />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Company *</label>
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
              Generate Description
            </button>
          </div>
        </div>
      )}

      {selectedAppId && (
        <ApplicationDetailModal
          applicationId={selectedAppId}
          onClose={() => setSelectedAppId(null)}
          onStatusUpdate={updateStatus}
        />
      )}

      {previewResumeApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPreviewResumeApp(null)}>
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Resume — {previewResumeApp.userName}</h3>
                <p className="text-sm text-slate-500">Applied for {previewResumeApp.jobTitle}</p>
              </div>
              <button onClick={() => setPreviewResumeApp(null)} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4">
              <ResumeViewer resumePath={previewResumeApp.resumeUrl} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
