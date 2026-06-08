import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Building2, Globe, MapPin, User } from 'lucide-react';
import api, { unwrap } from '../services/api';
import JobCard from '../components/JobCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';

export default function Company() {
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/companies/${id}`)
      .then((res) => setCompany(unwrap(res)))
      .catch(() => setCompany(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
  if (!company) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState title="Company not found" description="This employer page may have been removed." actionLabel="Browse jobs" actionTo="/jobs" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 px-6 py-10 text-white sm:px-10">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
              <Building2 className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{company.companyName}</h1>
              {company.location && (
                <p className="mt-2 flex items-center gap-1 text-primary-100">
                  <MapPin className="h-4 w-4" />{company.location}
                </p>
              )}
              <p className="mt-1 text-sm text-primary-200">{company.openJobsCount} open {company.openJobsCount === 1 ? 'position' : 'positions'}</p>
            </div>
          </div>
        </div>
        <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold">About the company</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {company.companyDescription || `${company.companyName} is actively hiring. Explore open roles below.`}
            </p>
            {company.companyWebsite && (
              <a
                href={company.companyWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
              >
                <Globe className="h-4 w-4" /> Visit website
              </a>
            )}
          </div>
          <div className="card bg-slate-50 p-5 dark:bg-slate-800/50">
            <h3 className="font-semibold">Recruiter</h3>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/40">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">{company.recruiterName}</p>
                {company.recruiterTitle && <p className="text-sm text-slate-500">{company.recruiterTitle}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-2xl font-bold">Open jobs at {company.companyName}</h2>
        {company.openJobs?.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {company.openJobs.map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        ) : (
          <p className="mt-6 text-slate-500">No open positions right now. <Link to="/jobs" className="text-primary-600 hover:underline">Browse all jobs</Link></p>
        )}
      </section>
    </div>
  );
}
