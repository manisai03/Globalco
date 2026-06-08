import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapPin, Briefcase, Share2, Bookmark, BookmarkCheck, Clock, Users, IndianRupee, CheckCircle2, Zap, ExternalLink, Building2 } from 'lucide-react';
import api, { unwrap } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import JobMatchScore from '../components/JobMatchScore';
import JobDescription from '../components/JobDescription';
import ResumeUploadBox from '../components/ResumeUploadBox';
import { formatSalary, daysAgo, parseSkills } from '../utils/formatters';
import toast from 'react-hot-toast';

export default function JobDetails() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [similarJobs, setSimilarJobs] = useState([]);
  const [coverLetter, setCoverLetter] = useState('');
  const [resume, setResume] = useState(null);
  const [applying, setApplying] = useState(false);
  const [easyApplying, setEasyApplying] = useState(false);

  const refreshJob = () => api.get(`/api/jobs/${id}`).then((res) => setJob(unwrap(res)));

  useEffect(() => {
    refreshJob();
    api.get(`/api/jobs/${id}/similar`).then((res) => setSimilarJobs(unwrap(res))).catch(() => setSimilarJobs([]));
  }, [id]);

  if (!job) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;

  const skillTags = parseSkills(job.skills);
  const highlights = [
    job.experienceLevel && `${job.experienceLevel} experience`,
    job.jobType && `${job.jobType} role`,
    job.category && `${job.category} department`,
    skillTags.length > 0 && `Skills: ${skillTags.slice(0, 4).join(', ')}`,
  ].filter(Boolean);

  const submitApplication = async (easy = false) => {
    if (!user) return navigate('/login');
    if (easy) setEasyApplying(true);
    else setApplying(true);
    try {
      const formData = new FormData();
      if (!easy && coverLetter) formData.append('coverLetter', coverLetter);
      if (!easy && resume) formData.append('resume', resume);
      await api.post(`/api/applications/jobs/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(easy ? 'Easy Apply submitted!' : 'Application submitted!');
      await refreshJob();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Application failed');
    } finally {
      setApplying(false);
      setEasyApplying(false);
    }
  };

  const toggleSave = async () => {
    if (!user) return navigate('/login');
    if (job.saved) {
      await api.delete(`/api/saved-jobs/${id}`);
      toast.success('Removed from saved');
    } else {
      await api.post(`/api/saved-jobs/${id}`);
      toast.success('Job saved');
    }
    await refreshJob();
  };

  const shareJob = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied!');
  };

  const canApply = user && !isAdmin && !job.applied && job.status === 'OPEN';
  const companyBlurb = job.companyDescription || `${job.company} is hiring for this role. Connect with the recruiter to learn more about the team and culture.`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold sm:text-3xl">{job.title}</h1>
                <p className="mt-2 text-lg font-medium text-slate-600 dark:text-slate-300">{job.company}</p>
                {job.createdById && (
                  <Link to={`/companies/${job.createdById}`} className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline">
                    <Building2 className="h-4 w-4" /> View company page
                  </Link>
                )}
                {job.recruiterTitle && job.createdByName && (
                  <p className="mt-1 text-sm text-slate-500">Posted by {job.createdByName} · {job.recruiterTitle}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={shareJob} className="rounded-lg border p-2 hover:bg-slate-50 dark:hover:bg-slate-800" title="Share">
                  <Share2 className="h-5 w-5" />
                </button>
                {user && !isAdmin && (
                  <button type="button" onClick={toggleSave} className="rounded-lg border p-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                    {job.saved ? <BookmarkCheck className="h-5 w-5 text-primary-600" /> : <Bookmark className="h-5 w-5" />}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-2 text-sm"><Briefcase className="h-4 w-4 text-slate-400" /><span>{job.experienceLevel || 'Not specified'}</span></div>
              <div className="flex items-center gap-2 text-sm"><IndianRupee className="h-4 w-4 text-slate-400" /><span>{formatSalary(job.salaryMin, job.salaryMax)}</span></div>
              <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-slate-400" /><span>{job.location}</span></div>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" />Posted {daysAgo(job.createdAt)}</span>
              <span className="flex items-center gap-1"><Users className="h-4 w-4" />{job.applicantCount || 0} applicants</span>
              <span className="rounded-full bg-slate-100 px-3 py-0.5 dark:bg-slate-800">{job.jobType}</span>
            </div>

            {isAdmin ? (
              <p className="mt-6 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Recruiter view — candidates apply from this page.
              </p>
            ) : job.applied ? (
              <button type="button" disabled className="mt-6 w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white sm:w-auto sm:px-12">
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> Applied</span>
              </button>
            ) : job.status === 'OPEN' && (
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => (user ? submitApplication(true) : navigate('/login'))}
                  disabled={easyApplying}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  <Zap className="h-5 w-5" />
                  {easyApplying ? 'Applying…' : 'Easy Apply'}
                </button>
                <button
                  type="button"
                  onClick={() => (user ? document.getElementById('apply-section')?.scrollIntoView({ behavior: 'smooth' }) : navigate('/login'))}
                  className="btn-secondary py-3"
                >
                  Apply with cover letter
                </button>
              </div>
            )}
          </div>

          {highlights.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold">Job highlights</h2>
              <ul className="mt-4 space-y-2">
                {highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-600" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {user && !isAdmin && !job.applied && job.matchPreview && (
            <JobMatchScore match={job.matchPreview} />
          )}

          <div className="card p-6">
            <h2 className="text-lg font-semibold">Job description</h2>
            <div className="mt-4"><JobDescription text={job.description} /></div>
          </div>

          {skillTags.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold">Key skills</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {skillTags.map((skill) => (
                  <span key={skill} className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-300">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {canApply && (
            <div id="apply-section" className="card border-2 border-primary-200 p-6 dark:border-primary-800">
              <h2 className="text-lg font-semibold">Full application</h2>
              <p className="mt-1 text-sm text-slate-500">Add a cover letter or upload a tailored resume</p>
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Why you're a great fit for this role…"
                rows={5}
                className="input-field mt-4"
              />
              <div className="mt-4">
                <ResumeUploadBox
                  compact
                  label="Upload resume"
                  fileName={resume?.name}
                  onUpload={(e) => setResume(e.target.files?.[0] || null)}
                  hint={!resume ? 'Your profile resume is used if no file is uploaded' : undefined}
                />
              </div>
              <button type="button" onClick={() => submitApplication(false)} disabled={applying} className="btn-primary mt-4 w-full sm:w-auto">
                {applying ? 'Submitting…' : 'Submit application'}
              </button>
            </div>
          )}

          {job.applied && (
            <div className="rounded-2xl bg-emerald-50 p-6 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
              <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5" /> You applied for this job</div>
              <p className="mt-2 text-sm">Track status in your dashboard.</p>
              <Link to="/dashboard" className="mt-3 inline-block text-sm font-medium underline">My applications →</Link>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="font-semibold">Salary</h3>
            <p className="mt-2 text-2xl font-bold text-primary-600">{formatSalary(job.salaryMin, job.salaryMax)}</p>
            <p className="mt-1 text-xs text-slate-500">Annual CTC range</p>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold">About {job.company}</h3>
            {job.location && <p className="mt-2 text-sm text-slate-500">{job.location}</p>}
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{companyBlurb}</p>
            {job.companyWebsite && (
              <a
                href={job.companyWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
              >
                Company website <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          {similarJobs.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold">Similar jobs</h3>
              <div className="mt-4 space-y-4">
                {similarJobs.map((j) => (
                  <div key={j.id} className="border-b border-slate-100 pb-4 last:border-0 dark:border-slate-800">
                    <Link to={`/jobs/${j.id}`} className="font-medium hover:text-primary-600">{j.title}</Link>
                    <p className="text-sm text-slate-500">{j.company}</p>
                    <p className="text-xs text-slate-400">{j.location} · {daysAgo(j.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
