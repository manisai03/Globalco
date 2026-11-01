import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ApplicationDetailView from '../components/ApplicationDetailView';

export default function ApplicationDetailPage() {
  const { id } = useParams();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2 text-muted-foreground">
        <Link to="/dashboard?tab=applications"><ArrowLeft /> Back to Dashboard</Link>
      </Button>
      <h1 className="text-3xl font-bold">My Application</h1>
      <div className="mt-8">
        <ApplicationDetailView applicationId={id} adminMode={false} />
      </div>
    </div>
  );
}
