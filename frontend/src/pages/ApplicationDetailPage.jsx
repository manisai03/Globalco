import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ApplicationDetailView from '../components/ApplicationDetailView';

export default function ApplicationDetailPage() {
  const { id } = useParams();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        to="/dashboard?tab=applications"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary-600 dark:text-slate-400"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>
      <h1 className="text-3xl font-bold">My Application</h1>
      <div className="mt-8">
        <ApplicationDetailView applicationId={id} adminMode={false} />
      </div>
    </div>
  );
}
