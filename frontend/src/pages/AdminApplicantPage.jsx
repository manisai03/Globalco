import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import ApplicationDetailView from '../components/ApplicationDetailView';

export default function AdminApplicantPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const updateStatus = async (appId, status) => {
    try {
      await api.patch(`/api/applications/${appId}/status`, { status });
      toast.success(`Status updated to ${status.replace('_', ' ')}`);
      navigate('/admin?tab=applicants');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const messageCandidate = (detail) => {
    navigate(`/admin?tab=messages&userId=${detail.userId}`);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        to="/admin?tab=applicants"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary-600 dark:text-slate-400"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Applicants
      </Link>
      <h1 className="text-3xl font-bold">Application Details</h1>
      <div className="mt-8">
        <ApplicationDetailView
          applicationId={id}
          adminMode
          onStatusUpdate={updateStatus}
          onMessage={messageCandidate}
        />
      </div>
    </div>
  );
}
