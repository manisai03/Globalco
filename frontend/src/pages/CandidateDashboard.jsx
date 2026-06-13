import { useEffect, useState } from 'react';

import { Link, useSearchParams } from 'react-router-dom';

import { FileText, Bookmark, Bell, Calendar, MapPin, Trash2 } from 'lucide-react';

import ChatPanel from '../components/ChatPanel';

import ProfilePanel from '../components/ProfilePanel';

import api, { unwrap } from '../services/api';

import JobCard from '../components/JobCard';

import LoadingSpinner from '../components/LoadingSpinner';

import toast from 'react-hot-toast';



const statusColors = {

  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',

  SHORTLISTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',

  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',

  INTERVIEW_SCHEDULED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',

  HIRED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',

  WITHDRAWN: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',

};



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



const NAV_ONLY_TABS = ['messages', 'profile'];



export default function CandidateDashboard() {

  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = searchParams.get('tab') || 'applications';

  const [tab, setTab] = useState(initialTab);

  const [applications, setApplications] = useState([]);

  const [savedJobs, setSavedJobs] = useState([]);

  const [recommended, setRecommended] = useState([]);

  const [interviews, setInterviews] = useState([]);

  const [savedSearches, setSavedSearches] = useState([]);

  const [loading, setLoading] = useState(true);

  const [appDateFilter, setAppDateFilter] = useState(null);

  const [interviewStatusFilter, setInterviewStatusFilter] = useState('ALL');

  const filteredApplications = filterByAppliedDate(applications, appDateFilter);

  const filteredInterviewApplications = filterByStatus(applications, interviewStatusFilter);



  const switchTab = (key) => {

    setTab(key);

    setSearchParams(key === 'applications' ? {} : { tab: key });

  };



  const load = async () => {

    try {

      const [apps, saved, rec, ints, alerts] = await Promise.all([

        api.get('/api/applications/me'),

        api.get('/api/saved-jobs'),

        api.get('/api/jobs/recommended'),

        api.get('/api/applications/interviews/me'),

        api.get('/api/saved-searches'),

      ]);

      setApplications(unwrap(apps));

      setSavedJobs(unwrap(saved));

      setRecommended(unwrap(rec));

      setInterviews(unwrap(ints));

      setSavedSearches(unwrap(alerts));

    } finally {

      setLoading(false);

    }

  };



  useEffect(() => { load(); }, []);



  useEffect(() => {

    const t = searchParams.get('tab') || 'applications';

    setTab(t);

  }, [searchParams]);



  const withdraw = async (id) => {

    await api.delete(`/api/applications/${id}`);

    toast.success('Application withdrawn');

    load();

  };



  const deleteAlert = async (id) => {

    await api.delete(`/api/saved-searches/${id}`);

    toast.success('Job alert removed');

    load();

  };



  const alertToJobsUrl = (alert) => {

    const q = new URLSearchParams();

    if (alert.search) q.set('search', alert.search);

    if (alert.location) q.set('location', alert.location);

    if (alert.jobType) q.set('jobType', alert.jobType);

    if (alert.experienceLevel) q.set('experienceLevel', alert.experienceLevel);

    if (alert.category) q.set('category', alert.category);

    if (alert.minSalary) q.set('minSalary', String(alert.minSalary));

    if (alert.sort) q.set('sort', alert.sort);

    return `/jobs?${q}`;

  };



  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;



  const pageTitle = tab === 'messages' ? 'Messages' : tab === 'profile' ? 'Profile' : 'My Dashboard';

  const pageSubtitle = {

    messages: 'View and reply to recruiter messages',

    profile: 'Manage your profile, education, and experience',

    interviews: 'Track shortlisted, rejected, hired, and interview updates',

    alerts: 'Saved searches — run them anytime from here',

    saved: 'Jobs you bookmarked for later',

    applications: 'Filter applications by when you applied',

  }[tab] || 'Track your applications and saved jobs';



  return (

    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">

      <h1 className="text-3xl font-bold">{pageTitle}</h1>

      <p className="mt-1 text-slate-500">{pageSubtitle}</p>



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

              {key === 'applications' && <span className="opacity-75">({applications.length})</span>}

              {key === 'saved' && <span className="opacity-75">({savedJobs.length})</span>}

              {key === 'interviews' && <span className="opacity-75">({filteredInterviewApplications.length})</span>}

              {key === 'alerts' && <span className="opacity-75">({savedSearches.length})</span>}

            </button>

          ))}

        </div>

      )}



      {tab === 'applications' && recommended.length > 0 && (

        <div className="mt-8">

          <h2 className="text-lg font-semibold">Recommended for you</h2>

          <p className="text-sm text-slate-500">Jobs matching your profile skills</p>

          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">

            {recommended.slice(0, 3).map((job) => <JobCard key={job.id} job={job} />)}

          </div>

        </div>

      )}



      {tab === 'applications' && (

        <div className="mt-8">

          <div className="mb-4 flex flex-wrap gap-2">

            {APPLICATION_DATE_FILTERS.map(({ key, label }) => (

              <button

                key={key}

                type="button"

                onClick={() => setAppDateFilter((current) => (current === key ? null : key))}

                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${

                  appDateFilter === key

                    ? 'bg-primary-600 text-white shadow-sm'

                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'

                }`}

              >

                {label}

                <span className="ml-1 opacity-75">({filterByAppliedDate(applications, key).length})</span>

              </button>

            ))}

            {appDateFilter && (

              <button type="button" onClick={() => setAppDateFilter(null)} className="text-sm text-slate-500 hover:text-primary-600">

                Show all

              </button>

            )}

          </div>



          {applications.length === 0 ? (

            <p className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">

              No applications yet. <Link to="/jobs" className="text-primary-600 hover:underline">Browse jobs →</Link>

            </p>

          ) : filteredApplications.length === 0 ? (

            <p className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">

              No applications {APPLICATION_DATE_FILTERS.find((f) => f.key === appDateFilter)?.label?.toLowerCase() || 'in this period'}.

            </p>

          ) : (

            <div className="space-y-4">

              {filteredApplications.map((app) => (

                <div key={app.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">

                  <div>

                    <Link to={`/jobs/${app.jobId}`} className="font-semibold hover:text-primary-600">{app.jobTitle}</Link>

                    <p className="text-sm text-slate-500">{app.company}</p>

                    {app.matchScore && <p className="mt-1 text-xs text-primary-600">AI Match Score: {app.matchScore}%</p>}

                    <p className="mt-1 text-xs text-slate-400">Applied {new Date(app.createdAt).toLocaleDateString()}</p>

                  </div>

                  <div className="flex items-center gap-3">

                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[app.status] || statusColors.PENDING}`}>

                      {app.status.replace('_', ' ')}

                    </span>

                    {app.status === 'PENDING' && (

                      <button onClick={() => withdraw(app.id)} className="text-sm text-red-600 hover:underline">Withdraw</button>

                    )}

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

      )}



      {tab === 'saved' && (

        <div className="mt-8">

          {savedJobs.length === 0 ? (

            <p className="text-center text-slate-500 py-12">No saved jobs yet.</p>

          ) : (

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

              {savedJobs.map((job) => <JobCard key={job.id} job={job} />)}

            </div>

          )}

        </div>

      )}



      {tab === 'interviews' && (

        <div className="mt-8 space-y-4">

          <div className="flex flex-wrap gap-2">

            {INTERVIEW_STATUS_FILTERS.map(({ key, label }) => (

              <button

                key={key}

                type="button"

                onClick={() => setInterviewStatusFilter(key)}

                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${

                  interviewStatusFilter === key

                    ? 'bg-primary-600 text-white shadow-sm'

                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'

                }`}

              >

                {label}

                {key !== 'ALL' && (

                  <span className="ml-1 opacity-75">({applications.filter((a) => a.status === key).length})</span>

                )}

              </button>

            ))}

          </div>



          {filteredInterviewApplications.length === 0 ? (

            <p className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">

              {interviewStatusFilter === 'ALL'

                ? 'No updates from recruiters yet. Keep applying — shortlisted, interview, and hiring updates will appear here.'

                : `No applications with status "${INTERVIEW_STATUS_FILTERS.find((f) => f.key === interviewStatusFilter)?.label}".`}

            </p>

          ) : (

            filteredInterviewApplications.map((app) => {

              const iv = interviewForApplication(interviews, app.id);

              return (

                <div key={app.id} className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">

                  <div>

                    <Link to={`/jobs/${app.jobId}`} className="font-semibold hover:text-primary-600">{app.jobTitle}</Link>

                    <p className="text-sm text-slate-500">{app.company}</p>

                    {iv && (

                      <p className="mt-2 flex items-center gap-1 text-sm">

                        <Calendar className="h-4 w-4 text-primary-600" />

                        {new Date(iv.scheduledAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}

                      </p>

                    )}

                    {iv?.location && (

                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">

                        <MapPin className="h-4 w-4" />{iv.location}

                      </p>

                    )}

                    {iv?.notes && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{iv.notes}</p>}

                    <p className="mt-1 text-xs text-slate-400">Applied {new Date(app.createdAt).toLocaleDateString()}</p>

                  </div>

                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[app.status] || statusColors.PENDING}`}>

                    {app.status.replace('_', ' ')}

                  </span>

                </div>

              );

            })

          )}

        </div>

      )}



      {tab === 'alerts' && (

        <div className="mt-8 space-y-4">

          {savedSearches.length === 0 ? (

            <p className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">

              No job alerts yet. <Link to="/jobs" className="text-primary-600 hover:underline">Search jobs</Link> and use &quot;Save job alert&quot; in filters.

            </p>

          ) : (

            savedSearches.map((alert) => (

              <div key={alert.id} className="card flex flex-wrap items-center justify-between gap-4 p-5">

                <div>

                  <p className="font-semibold">{alert.name}</p>

                  <p className="mt-1 text-sm text-slate-500">{alert.matchCount} matching open jobs</p>

                </div>

                <div className="flex items-center gap-3">

                  <Link to={alertToJobsUrl(alert)} className="btn-primary text-sm">View jobs</Link>

                  <button type="button" onClick={() => deleteAlert(alert.id)} className="rounded-lg p-2 text-slate-400 hover:text-red-600" aria-label="Delete alert">

                    <Trash2 className="h-4 w-4" />

                  </button>

                </div>

              </div>

            ))

          )}

        </div>

      )}



      <div className={tab === 'messages' ? 'mt-8' : 'hidden'} aria-hidden={tab !== 'messages'}>

        <ChatPanel embedded onUnreadChange={() => {}} />

      </div>



      {tab === 'profile' && (

        <div className="mt-8">

          <ProfilePanel />

        </div>

      )}

    </div>

  );

}


