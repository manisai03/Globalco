import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import api from '../services/api';
import ApplicationDetailView from '../components/ApplicationDetailView';
import { formatStatus } from '../utils/applicationStatus';

export default function AdminApplicantPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const updateStatus = async (appId, status) => {
    try {
      await api.patch(`/api/applications/${appId}/status`, { status });
      toast.success(`Status updated to ${formatStatus(status)}`);
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
      <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2 text-muted-foreground">
        <Link to="/admin?tab=applicants"><ArrowLeft /> Back to Applicants</Link>
      </Button>
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
