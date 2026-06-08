import { useEffect, useState } from 'react';

import { Link, useSearchParams } from 'react-router-dom';

import { Eye, FileText, Bookmark, Bell, Calendar, MapPin, Trash2 } from 'lucide-react';

import ApplicationDetailModal from '../components/ApplicationDetailModal';

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

  { key: 'interviews', label: 'Interviews', icon: Calendar },

  { key: 'saved', label: 'Saved Jobs', icon: Bookmark },

  { key: 'alerts', label: 'Job Alerts', icon: Bell },

];



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

  const [selectedAppId, setSelectedAppId] = useState(null);



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

    interviews: 'Upcoming and scheduled interviews',

    alerts: 'Saved searches — run them anytime from here',

    saved: 'Jobs you bookmarked for later',

    applications: 'Track your applications and saved jobs',

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

              {key === 'interviews' && <span className="opacity-75">({interviews.length})</span>}

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

          {applications.length === 0 ? (

            <p className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">

              No applications yet. <Link to="/jobs" className="text-primary-600 hover:underline">Browse jobs →</Link>

            </p>

          ) : (

            <div className="space-y-4">

              {applications.map((app) => (

                <div key={app.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">

                  <div>

                    <Link to={`/jobs/${app.jobId}`} className="font-semibold hover:text-primary-600">{app.jobTitle}</Link>

                    <p className="text-sm text-slate-500">{app.company}</p>

                    {app.matchScore && <p className="mt-1 text-xs text-primary-600">AI Match Score: {app.matchScore}%</p>}

                    <p className="mt-1 text-xs text-slate-400">Applied {new Date(app.createdAt).toLocaleDateString()}</p>

                  </div>

                  <div className="flex items-center gap-3">

                    <button onClick={() => setSelectedAppId(app.id)} className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline">

                      <Eye className="h-4 w-4" /> View

                    </button>

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

          {interviews.length === 0 ? (

            <p className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">

              No interviews scheduled yet. Keep applying — recruiters will schedule here.

            </p>

          ) : (

            interviews.map((iv) => (

              <div key={iv.id} className="card flex flex-wrap items-start justify-between gap-4 p-5">

                <div>

                  <Link to={`/jobs/${iv.jobId}`} className="font-semibold hover:text-primary-600">{iv.jobTitle}</Link>

                  <p className="text-sm text-slate-500">{iv.company}</p>

                  <p className="mt-2 flex items-center gap-1 text-sm">

                    <Calendar className="h-4 w-4 text-primary-600" />

                    {new Date(iv.scheduledAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}

                  </p>

                  {iv.location && (

                    <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">

                      <MapPin className="h-4 w-4" />{iv.location}

                    </p>

                  )}

                  {iv.notes && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{iv.notes}</p>}

                </div>

                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors.INTERVIEW_SCHEDULED}`}>

                  {iv.status}

                </span>

              </div>

            ))

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



      {selectedAppId && (

        <ApplicationDetailModal

          applicationId={selectedAppId}

          onClose={() => setSelectedAppId(null)}

          onStatusUpdate={() => {}}

          adminMode={false}

        />

      )}

    </div>

  );

}


