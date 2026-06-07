import { useEffect, useState } from 'react';

import { useParams, useNavigate, Link } from 'react-router-dom';

import { MapPin, Briefcase, Share2, Bookmark, BookmarkCheck, Clock, Users, IndianRupee, CheckCircle2 } from 'lucide-react';

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



  useEffect(() => {

    api.get(`/api/jobs/${id}`).then((res) => setJob(unwrap(res)));

    api.get(`/api/jobs?category=&size=4`).then((res) => {

      const data = unwrap(res);

      setSimilarJobs(data.content.filter((j) => String(j.id) !== id).slice(0, 3));

    });

  }, [id]);



  if (!job) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;



  const skillTags = parseSkills(job.skills);

  const highlights = [

    job.experienceLevel && `${job.experienceLevel} experience required`,

    job.jobType && `${job.jobType} position`,

    job.category && `${job.category} department`,

    skillTags.length > 0 && `Key skills: ${skillTags.slice(0, 4).join(', ')}`,

  ].filter(Boolean);



  const handleApply = async () => {

    if (!user) return navigate('/login');

    setApplying(true);

    try {

      const formData = new FormData();

      if (coverLetter) formData.append('coverLetter', coverLetter);

      if (resume) formData.append('resume', resume);

      await api.post(`/api/applications/jobs/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

      toast.success('Application submitted!');

      const res = await api.get(`/api/jobs/${id}`);

      setJob(unwrap(res));

    } catch (err) {

      toast.error(err.response?.data?.message || 'Application failed');

    } finally {

      setApplying(false);

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

    const res = await api.get(`/api/jobs/${id}`);

    setJob(unwrap(res));

  };



  const shareJob = () => {

    navigator.clipboard.writeText(window.location.href);

    toast.success('Link copied!');

  };



  return (

    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">

      <div className="grid gap-8 lg:grid-cols-3">

        <div className="lg:col-span-2 space-y-6">

          {/* Job Header */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">

            <div className="flex flex-wrap items-start justify-between gap-4">

              <div>

                <h1 className="text-2xl font-bold sm:text-3xl">{job.title}</h1>

                <p className="mt-2 text-lg font-medium text-slate-600 dark:text-slate-300">{job.company}</p>

              </div>

              <div className="flex gap-2">

                <button onClick={shareJob} className="rounded-lg border p-2 hover:bg-slate-50 dark:hover:bg-slate-800" title="Share">

                  <Share2 className="h-5 w-5" />

                </button>

                {user && !isAdmin && (
                  <button onClick={toggleSave} className="rounded-lg border p-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                    {job.saved ? <BookmarkCheck className="h-5 w-5 text-primary-600" /> : <Bookmark className="h-5 w-5" />}
                  </button>
                )}

              </div>

            </div>



            <div className="mt-6 grid gap-4 sm:grid-cols-3">

              <div className="flex items-center gap-2 text-sm">

                <Briefcase className="h-4 w-4 text-slate-400" />

                <span>{job.experienceLevel || 'Not specified'}</span>

              </div>

              <div className="flex items-center gap-2 text-sm">

                <IndianRupee className="h-4 w-4 text-slate-400" />

                <span>{formatSalary(job.salaryMin, job.salaryMax)}</span>

              </div>

              <div className="flex items-center gap-2 text-sm">

                <MapPin className="h-4 w-4 text-slate-400" />

                <span>{job.location}</span>

              </div>

            </div>



            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">

              <span className="flex items-center gap-1"><Clock className="h-4 w-4" />Posted: {daysAgo(job.createdAt)}</span>

              <span className="flex items-center gap-1"><Users className="h-4 w-4" />{job.applicantCount || 0}+ Applicants</span>

              <span className="rounded-full bg-slate-100 px-3 py-0.5 dark:bg-slate-800">{job.jobType}</span>

            </div>



            {isAdmin ? (
              <p className="mt-6 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Recruiter view — browse market jobs. Only candidates can apply.
              </p>
            ) : job.applied ? (
              <button disabled className="mt-6 w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white sm:w-auto sm:px-12">
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> Applied</span>
              </button>
            ) : job.status === 'OPEN' && (
              <button
                onClick={() => user ? document.getElementById('apply-section')?.scrollIntoView({ behavior: 'smooth' }) : navigate('/login')}
                className="mt-6 w-full rounded-xl bg-primary-600 py-3 font-semibold text-white hover:bg-primary-700 sm:w-auto sm:px-12"
              >
                Apply Now
              </button>
            )}

          </div>



          {/* Job Highlights */}

          {highlights.length > 0 && (

            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">

              <h2 className="text-lg font-semibold">Job highlights</h2>

              <ul className="mt-4 space-y-2">

                {highlights.map((h, i) => (

                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">

                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-600" />

                    {h}

                  </li>

                ))}

              </ul>

            </div>

          )}



          {/* Match Score - for logged in candidates */}

          {user && !isAdmin && !job.applied && job.matchPreview && (
            <JobMatchScore match={job.matchPreview} />
          )}



          {/* Job Description */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">

            <h2 className="text-lg font-semibold">Job description</h2>

            <div className="mt-4">
              <JobDescription text={job.description} />
            </div>

          </div>



          {/* Key Skills */}

          {skillTags.length > 0 && (

            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">

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



          {/* Role Details */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">

            <h2 className="text-lg font-semibold">Role details</h2>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">

              {[

                ['Role', job.title],

                ['Industry', job.category || 'Technology'],

                ['Department', job.category || 'Engineering'],

                ['Employment Type', job.jobType],

                ['Experience', job.experienceLevel || 'Not specified'],

                ['Location', job.location],

              ].map(([label, value]) => (

                <div key={label}>

                  <dt className="text-slate-500">{label}</dt>

                  <dd className="font-medium">{value}</dd>

                </div>

              ))}

            </dl>

          </div>



          {/* Apply Section */}

          {user && !isAdmin && !job.applied && job.status === 'OPEN' && (

            <div id="apply-section" className="rounded-2xl border-2 border-primary-200 bg-white p-6 dark:border-primary-800 dark:bg-slate-900">

              <h2 className="text-lg font-semibold">Apply for this position</h2>

              <p className="mt-1 text-sm text-slate-500">Submit your application with cover letter and resume</p>



              <textarea

                value={coverLetter}

                onChange={(e) => setCoverLetter(e.target.value)}

                placeholder="Write a cover letter explaining why you're a great fit..."

                rows={5}

                className="mt-4 w-full rounded-xl border px-4 py-3 dark:border-slate-700 dark:bg-slate-800"

              />

              <div className="mt-4">
                <ResumeUploadBox
                  compact
                  label="Upload Resume"
                  fileName={resume?.name}
                  onUpload={(e) => setResume(e.target.files?.[0] || null)}
                  hint={!resume ? 'Your profile resume will be used if no file is uploaded' : undefined}
                />
              </div>

              <button onClick={handleApply} disabled={applying} className="mt-4 w-full rounded-xl bg-primary-600 py-3 font-semibold text-white hover:bg-primary-700 disabled:opacity-50 sm:w-auto sm:px-10">

                {applying ? 'Submitting Application...' : 'Submit Application'}

              </button>

            </div>

          )}



          {job.applied && (

            <div className="rounded-2xl bg-emerald-50 p-6 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">

              <div className="flex items-center gap-2 font-semibold">

                <CheckCircle2 className="h-5 w-5" /> You have applied for this job

              </div>

              <p className="mt-2 text-sm">Track your application status in your dashboard.</p>

              <Link to="/dashboard" className="mt-3 inline-block text-sm font-medium underline">Go to My Applications →</Link>

            </div>

          )}

        </div>



        {/* Sidebar */}

        <div className="space-y-6">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">

            <h3 className="font-semibold">Salary insights</h3>

            <p className="mt-2 text-2xl font-bold text-primary-600">{formatSalary(job.salaryMin, job.salaryMax)}</p>

            <p className="mt-1 text-xs text-slate-500">Estimated range for this role</p>

          </div>



          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">

            <h3 className="font-semibold">About {job.company}</h3>

            <p className="mt-2 text-sm text-slate-500">Globalco Technologies — Hitech City, Hyderabad</p>

            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Leading recruitment and technology company building AI-powered hiring solutions.</p>

          </div>



          {similarJobs.length > 0 && (

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">

              <h3 className="font-semibold">Jobs you might like</h3>

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


