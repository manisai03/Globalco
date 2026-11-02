import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ApplicationDetailView from '../components/ApplicationDetailView';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function AdminApplicantPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const backTo = location.state?.backTo || '/admin?tab=applicants';
  useDocumentTitle('Application details');

  const messageCandidate = (detail) => {
    navigate(`/admin?tab=messages&userId=${detail.userId}`);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2 text-muted-foreground">
        <Link to={backTo}><ArrowLeft /> Back to Applicants</Link>
      </Button>
      <h1 className="text-3xl font-bold">Application Details</h1>
      <div className="mt-8">
        <ApplicationDetailView
          applicationId={id}
          adminMode
          onMessage={messageCandidate}
        />
      </div>
    </div>
  );
}
