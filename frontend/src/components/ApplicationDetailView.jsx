import { useEffect, useState } from 'react';
import { Mail, Phone, MapPin, MessageSquare } from 'lucide-react';
import api, { unwrap } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import JobMatchScore from './JobMatchScore';
import ResumeViewer from './ResumeViewer';
import { daysAgo } from '../utils/formatters';

const STATUS_ACTIONS = ['SHORTLISTED', 'REJECTED', 'INTERVIEW_SCHEDULED', 'HIRED'];

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  SHORTLISTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  INTERVIEW_SCHEDULED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  HIRED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  WITHDRAWN: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

export default function ApplicationDetailView({
  applicationId,
  adminMode = true,
  onStatusUpdate,
  onMessage,
}) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/applications/${applicationId}`)
      .then((res) => setDetail(unwrap(res)))
      .finally(() => setLoading(false));
  }, [applicationId]);

  const resumePath = detail?.applicationResumeUrl || detail?.userProfileResumeUrl;

  if (loading) {
    return <div className="flex justify-center py-16"><LoadingSpinner /></div>;
  }

  if (!detail) {
    return <p className="py-12 text-center text-slate-500">Application not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{detail.userName}</h2>
          <p className="text-slate-500">{detail.userEmail}</p>
          <p className="mt-1 text-sm text-slate-500">{detail.jobTitle} at {detail.company}</p>
          <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${statusColors[detail.status] || statusColors.PENDING}`}>
            {detail.status.replace('_', ' ')}
          </span>
        </div>
        <div className="text-right text-sm text-slate-500">
          <p>Applied {daysAgo(detail.createdAt)}</p>
          <p>{new Date(detail.createdAt).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <h4 className="font-semibold">Contact Information</h4>
          <div className="mt-3 space-y-2 text-sm">
            <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" />{detail.userEmail}</p>
            {detail.userPhone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" />{detail.userPhone}</p>}
            {detail.userLocation && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" />{detail.userLocation}</p>}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <h4 className="font-semibold">Applied For</h4>
          <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <p><strong>Role:</strong> {detail.jobTitle}</p>
            <p><strong>Location:</strong> {detail.jobLocation}</p>
            <p><strong>Type:</strong> {detail.jobType}</p>
            <p><strong>Experience:</strong> {detail.jobExperienceLevel || 'Not specified'}</p>
          </div>
        </div>
      </div>

      {detail.userSkills && (
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <h4 className="font-semibold">Candidate Skills</h4>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{detail.userSkills}</p>
        </div>
      )}

      {detail.userBio && (
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <h4 className="font-semibold">About Candidate</h4>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{detail.userBio}</p>
        </div>
      )}

      {detail.coverLetter && (
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <h4 className="font-semibold">Cover Letter</h4>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">{detail.coverLetter}</p>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <h4 className="font-semibold">Resume Submitted by Applicant</h4>
        <div className="mt-3">
          <ResumeViewer resumePath={resumePath} showInlinePreview={false} />
        </div>
      </div>

      {detail.matchBreakdown && <JobMatchScore match={detail.matchBreakdown} />}

      {adminMode && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={() => onMessage?.(detail)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <MessageSquare className="h-4 w-4" /> Message Candidate
          </button>
          <div className="flex flex-wrap gap-2">
            {STATUS_ACTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onStatusUpdate?.(detail.id, s)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-white dark:hover:bg-slate-800 ${detail.status === s ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30' : ''}`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
