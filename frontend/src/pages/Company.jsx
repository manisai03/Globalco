import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Building2, Globe, MapPin } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api, { unwrap } from '../services/api';
import JobCard from '../components/JobCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

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

  if (loading) return <LoadingSpinner fullScreen />;
  if (!company) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState icon={Building2} title="Company not found" description="This employer page may have been removed." actionLabel="Browse jobs" actionTo="/jobs" />
      </div>
    );
  }

  const recruiterInitials = (company.recruiterName || '?')
    .split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Card className="gap-0 overflow-hidden py-0">
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 px-6 py-10 text-white sm:px-10">
          <div className="flex items-start gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <Building2 className="size-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{company.companyName}</h1>
              {company.location && (
                <p className="mt-2 flex items-center gap-1 text-primary-100">
                  <MapPin className="size-4" />{company.location}
                </p>
              )}
              <p className="mt-1 text-sm text-primary-200">{company.openJobsCount} open {company.openJobsCount === 1 ? 'position' : 'positions'}</p>
            </div>
          </div>
        </div>
        <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold">About the company</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {company.companyDescription || `${company.companyName} is actively hiring. Explore open roles below.`}
            </p>
            {company.companyWebsite && (
              <Button asChild variant="link" className="mt-2 px-0">
                <a href={company.companyWebsite} target="_blank" rel="noopener noreferrer">
                  <Globe /> Visit website
                </a>
              </Button>
            )}
          </div>
          <Card className="bg-muted/50 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Recruiter</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarFallback className="bg-accent font-semibold text-accent-foreground">{recruiterInitials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">{company.recruiterName}</p>
                {company.recruiterTitle && <p className="truncate text-sm text-muted-foreground">{company.recruiterTitle}</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </Card>

      <section className="mt-10">
        <h2 className="text-2xl font-bold">Open jobs at {company.companyName}</h2>
        {company.openJobs?.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {company.openJobs.map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        ) : (
          <p className="mt-6 text-muted-foreground">No open positions right now. <Link to="/jobs" className="font-medium text-primary hover:underline">Browse all jobs</Link></p>
        )}
      </section>
    </div>
  );
}
