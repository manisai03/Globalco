import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, Pencil, Plus, SearchX } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import api, { unwrap } from '../services/api';
import { useAuth } from '../context/auth';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import SelectField from '../components/common/SelectField';
import {
  buildJobDefaults,
  scrubGlobalcoFromDescription,
  JOB_TYPES,
  CATEGORIES,
  EXPERIENCE_LEVELS,
  jobToForm,
} from '../utils/jobFormDefaults';
import { resolveRecruiterCompany } from '../utils/recruiterCompany';
import { getApiErrorMessage } from '../utils/apiError';

function Field({ id, label, required, children, action, hint }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}{required && <span className="text-destructive">*</span>}</Label>
        {action}
      </div>
      {children}
      {hint}
    </div>
  );
}

export default function AdminJobFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUser } = useAuth();
  const [jobForm, setJobForm] = useState(() => location.state?.jobForm || buildJobDefaults(user));
  const [loaded, setLoaded] = useState({ id: null, job: null, error: false });
  const [formSourceId, setFormSourceId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    refreshUser?.()?.catch?.(() => {});
  }, [refreshUser]);

  useEffect(() => {
    if (!isEdit) return undefined;
    let cancelled = false;
    api.get(`/api/jobs/${id}`)
      .then((res) => { if (!cancelled) setLoaded({ id, job: unwrap(res), error: false }); })
      .catch(() => {
        if (cancelled) return;
        toast.error('Job not found');
        setLoaded({ id, job: null, error: true });
      });
    return () => { cancelled = true; };
  }, [id, isEdit]);

  if (isEdit && loaded.id === id && loaded.job && formSourceId !== id) {
    setFormSourceId(id);
    setJobForm(jobToForm(loaded.job, user));
  }

  const set = (field) => (e) => setJobForm((f) => ({ ...f, [field]: e.target.value }));
  const company = resolveRecruiterCompany(user, '');

  const saveJob = async (e) => {
    e.preventDefault();
    if (!company) {
      return toast.error('Set your real company name in your Profile before posting jobs');
    }
    const salaryMin = jobForm.salaryMin ? Number(jobForm.salaryMin) : null;
    const salaryMax = jobForm.salaryMax ? Number(jobForm.salaryMax) : null;
    if ((salaryMin != null && salaryMin < 0) || (salaryMax != null && salaryMax < 0)) {
      return toast.error('Salary cannot be negative');
    }
    if (salaryMin != null && salaryMax != null && salaryMin > salaryMax) {
      return toast.error('Min salary cannot be greater than max salary');
    }
    const payload = {
      ...jobForm,
      description: scrubGlobalcoFromDescription(jobForm.description, company),
      salaryMin,
      salaryMax,
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
      toast.error(getApiErrorMessage(err, 'Failed to save job'));
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && loaded.id === id && loaded.error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState icon={SearchX} title="Job not found" description="It may have been deleted." actionLabel="Back to Jobs" actionTo="/admin?tab=jobs" />
      </div>
    );
  }

  if (isEdit && formSourceId !== id) return <LoadingSpinner fullScreen />;

  const accent = isEdit
    ? { box: 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30', icon: 'bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200', card: 'border-amber-200 dark:border-amber-800', button: 'bg-amber-600 hover:bg-amber-700' }
    : { box: 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30', icon: 'bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200', card: 'border-emerald-200 dark:border-emerald-800', button: 'bg-emerald-600 hover:bg-emerald-700' };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2 text-muted-foreground">
        <Link to="/admin?tab=jobs"><ArrowLeft /> Back to Jobs</Link>
      </Button>

      <div className={cn('mb-6 flex items-center gap-3 rounded-2xl border-2 p-4', accent.box)}>
        <div className={cn('flex size-10 items-center justify-center rounded-full', accent.icon)}>
          {isEdit ? <Pencil className="size-5" /> : <Plus className="size-5" />}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? 'Edit Job' : 'Post a New Job'}</h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? 'Update the details for this listing' : 'Fill in the form to create a new job posting'}
          </p>
        </div>
      </div>

      <Card className={cn('border-2', accent.card)}>
        <form onSubmit={saveJob}>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="job-title" label="Job Title" required>
                <Input id="job-title" value={jobForm.title} onChange={set('title')} required maxLength={150} placeholder="e.g. Senior Software Engineer" />
              </Field>
              <Field
                id="job-company"
                label="Company"
                hint={
                  <p className={cn('text-xs', company ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400')}>
                    {company ? 'From your profile. ' : 'Set your company name in your profile to post jobs. '}
                    <Link to="/admin?tab=profile" className="underline">Edit profile</Link>
                  </p>
                }
              >
                <Input id="job-company" value={company} readOnly disabled placeholder="Not set" />
              </Field>
              <Field id="job-location" label="Location" required>
                <Input id="job-location" value={jobForm.location} onChange={set('location')} required maxLength={150} placeholder="Hyderabad / Remote" />
              </Field>
              <Field id="job-type" label="Job Type" required>
                <SelectField id="job-type" value={jobForm.jobType} onValueChange={(v) => setJobForm((f) => ({ ...f, jobType: v }))} options={JOB_TYPES} />
              </Field>
              <Field id="job-category" label="Category">
                <SelectField id="job-category" value={jobForm.category} onValueChange={(v) => setJobForm((f) => ({ ...f, category: v }))} options={CATEGORIES} />
              </Field>
              <Field id="job-experience" label="Experience Level">
                <SelectField id="job-experience" value={jobForm.experienceLevel} onValueChange={(v) => setJobForm((f) => ({ ...f, experienceLevel: v }))} options={EXPERIENCE_LEVELS} />
              </Field>
              <Field id="job-salary-min" label="Min Salary (₹/year)">
                <Input id="job-salary-min" type="number" min={0} inputMode="numeric" value={jobForm.salaryMin} onChange={set('salaryMin')} placeholder="800000" />
              </Field>
              <Field id="job-salary-max" label="Max Salary (₹/year)">
                <Input id="job-salary-max" type="number" min={0} inputMode="numeric" value={jobForm.salaryMax} onChange={set('salaryMax')} placeholder="1500000" />
              </Field>
            </div>

            <Field id="job-skills" label="Required Skills (comma separated)">
              <Input id="job-skills" value={jobForm.skills} onChange={set('skills')} maxLength={1000} placeholder="Java, React, MySQL" />
            </Field>

            <Field id="job-description" label="Job Description" required>
              <Textarea id="job-description" value={jobForm.description} onChange={set('description')} rows={10} required maxLength={20000} placeholder="Describe the role, responsibilities, and requirements. Markdown headings and bullet lists are supported." />
            </Field>
          </CardContent>
          <CardFooter className="mt-6 gap-3">
            <Button type="submit" size="lg" disabled={saving || !company} className={cn('text-white', accent.button)}>
              {saving && <Loader2 className="animate-spin" />}
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Publish Job'}
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/admin?tab=jobs">Cancel</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
