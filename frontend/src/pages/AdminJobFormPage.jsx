import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { unwrap } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  buildJobDefaults,
  scrubGlobalcoFromDescription,
  JOB_TYPES,
  CATEGORIES,
  EXPERIENCE_LEVELS,
  jobToForm,
} from '../utils/jobFormDefaults';
import { resolveRecruiterCompany } from '../utils/recruiterCompany';

export default function AdminJobFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUser } = useAuth();
  const [jobForm, setJobForm] = useState(() => location.state?.jobForm || buildJobDefaults(user));
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    refreshUser?.();
  }, [refreshUser]);

  useEffect(() => {
    if (!isEdit) {
      if (location.state?.jobForm) {
        setJobForm(location.state.jobForm);
      } else if (user) {
        setJobForm(buildJobDefaults(user));
      }
      return;
    }
    api.get(`/api/jobs/${id}`)
      .then((res) => setJobForm(jobToForm(unwrap(res), user)))
      .catch(() => toast.error('Job not found'))
      .finally(() => setLoading(false));
  }, [id, isEdit, user?.id]);

  const syncCompanyFromProfile = async () => {
    const fresh = await refreshUser();
    const company = resolveRecruiterCompany(fresh, '');
    if (!company) {
      return toast.error('Update Company Name in your Profile (e.g. XPO)');
    }
    setJobForm((f) => ({ ...f, company, location: fresh.location?.trim() || f.location }));
    toast.success(`Company set to ${company}`);
  };

  const saveJob = async (e) => {
    e.preventDefault();
    const company = resolveRecruiterCompany(user, jobForm.company);
    if (!company) {
      return toast.error('Set your company name in Profile or the Company field');
    }
    const payload = {
      ...jobForm,
      company,
      description: scrubGlobalcoFromDescription(jobForm.description, company),
      salaryMin: jobForm.salaryMin ? Number(jobForm.salaryMin) : null,
      salaryMax: jobForm.salaryMax ? Number(jobForm.salaryMax) : null,
    };
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/api/jobs/${id}`, payload);
        toast.success('Job updated successfully');
      } else {
        await api.post('/api/jobs', payload);
        toast.success('New job posted successfully');
      }
      navigate('/admin?tab=jobs');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save job');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        to="/admin?tab=jobs"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary-600 dark:text-slate-400"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Jobs
      </Link>

      <div className={`mb-6 flex items-center gap-3 rounded-2xl border-2 p-4 ${
        isEdit
          ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30'
          : 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30'
      }`}>
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isEdit ? 'bg-amber-200 dark:bg-amber-800' : 'bg-emerald-200 dark:bg-emerald-800'}`}>
          {isEdit ? <Pencil className="h-5 w-5 text-amber-800 dark:text-amber-200" /> : <Plus className="h-5 w-5 text-emerald-800 dark:text-emerald-200" />}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? 'Edit Job' : 'Post a New Job'}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {isEdit ? 'Update the details for this listing' : 'Fill in the form to create a new job posting'}
          </p>
        </div>
      </div>

      <form onSubmit={saveJob} className={`space-y-4 rounded-2xl border-2 bg-white p-6 dark:bg-slate-900 ${
        isEdit ? 'border-amber-200 dark:border-amber-800' : 'border-emerald-200 dark:border-emerald-800'
      }`}>
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
              placeholder="Your recruiting company"
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
          <textarea value={jobForm.description} onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })} rows={10} className="mt-1 w-full rounded-lg border px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800" required placeholder="Describe the role, responsibilities, and requirements..." />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={jobForm.featured} onChange={(e) => setJobForm({ ...jobForm, featured: e.target.checked })} className="rounded" />
          Mark as Featured Job
        </label>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className={`rounded-xl px-8 py-3 font-semibold text-white disabled:opacity-50 ${isEdit ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Publish Job'}
          </button>
          <Link to="/admin?tab=jobs" className="rounded-xl border px-6 py-3 font-medium hover:bg-slate-50 dark:hover:bg-slate-800">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
