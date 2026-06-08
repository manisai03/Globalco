import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Briefcase, IndianRupee, Clock, Zap, ExternalLink, Building2 } from 'lucide-react';
import api, { unwrap } from '../services/api';
import { useAuth } from '../context/AuthContext';
import JobDescription from './JobDescription';
import LoadingSpinner from './LoadingSpinner';
import { formatSalary, daysAgo, parseSkills } from '../utils/formatters';
import toast from 'react-hot-toast';

export default function JobPreviewPanel({ jobId, onApplied }) {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return;
    }
    setLoading(true);
    api.get(`/api/jobs/${jobId}`)
      .then((res) => setJob(unwrap(res)))
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
  }, [jobId]);

  const easyApply = async () => {
    if (!user) return navigate('/login');
    setApplying(true);
    try {
      const formData = new FormData();
      await api.post(`/api/applications/jobs/${jobId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Easy Apply submitted!');
      const res = await api.get(`/api/jobs/${jobId}`);
      setJob(unwrap(res));
      onApplied?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Application failed');
    } finally {
      setApplying(false);
    }
  };

  if (!jobId) {
    return (
      <div className="card flex h-full min-h-[420px] flex-col items-center justify-center p-8 text-center text-slate-500">
        <Briefcase className="h-12 w-12 text-slate-300" />
        <p className="mt-4 font-medium">Select a job to preview</p>
        <p className="mt-1 text-sm">Click any listing on the left to see details here</p>
      </div>
    );
  }

  if (loading || !job) {
    return (
      <div className="card flex min-h-[420px] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const skills = parseSkills(job.skills);
  const canApply = user && !isAdmin && !job.applied && job.status === 'OPEN';

  return (
    <div className="card sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto p-6">
      <h2 className="text-xl font-bold">{job.title}</h2>
      <p className="mt-1 text-slate-500">{job.company}</p>
      {job.createdById && (
        <Link to={`/companies/${job.createdById}`} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline">
          <Building2 className="h-4 w-4" /> View company
        </Link>
      )}

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
        <span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-slate-400" />{job.location}</span>
        <span className="flex items-center gap-1"><IndianRupee className="h-4 w-4 text-slate-400" />{formatSalary(job.salaryMin, job.salaryMax)}</span>
        <span className="flex items-center gap-1"><Clock className="h-4 w-4 text-slate-400" />{daysAgo(job.createdAt)}</span>
      </div>

      {skills.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {skills.slice(0, 6).map((s) => (
            <span key={s} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">{s}</span>
          ))}
        </div>
      )}

      <div className="mt-5 max-h-48 overflow-y-auto text-sm text-slate-600 dark:text-slate-300">
        <JobDescription text={job.description} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {canApply && (
          <button type="button" onClick={easyApply} disabled={applying} className="btn-primary inline-flex gap-2">
            <Zap className="h-4 w-4" />
            {applying ? 'Applying…' : 'Easy Apply'}
          </button>
        )}
        {job.applied && (
          <span className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">Applied</span>
        )}
        <Link to={`/jobs/${job.id}`} className="btn-secondary inline-flex gap-1">
          Full details <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
