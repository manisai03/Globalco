import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Users, Building2, TrendingUp, Zap, Shield, BarChart3, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import api, { unwrap } from '../services/api';
import JobCard from '../components/JobCard';
import JobCardSkeleton from '../components/common/JobCardSkeleton';
import { useAuth } from '../context/auth';

const QUICK_TAGS = ['Remote', 'Engineering', 'Full-time', 'Hyderabad'];

const STEPS = [
  { icon: Search, title: 'Discover', desc: 'Filter by role, salary, location, and experience — like Naukri or LinkedIn.' },
  { icon: Zap, title: 'Easy Apply', desc: 'One-click apply with your profile resume and AI-powered match insights.' },
  { icon: BarChart3, title: 'Track', desc: 'Monitor application status, chat with recruiters, and manage saved jobs.' },
];

function SectionHeader({ title, subtitle, to }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {to && (
        <Button asChild variant="link" className="px-0">
          <Link to={to}>View all <ArrowRight /></Link>
        </Button>
      )}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [featured, setFeatured] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [stats, setStats] = useState({ openJobs: 0, totalJobs: 0 });
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const showRecommended = user && !isAdmin;
    Promise.allSettled([
      api.get('/api/jobs/featured'),
      api.get('/api/public/stats'),
      api.get('/api/jobs/categories'),
      showRecommended ? api.get('/api/jobs/recommended') : Promise.resolve(null),
    ]).then(([featuredRes, statsRes, categoriesRes, recommendedRes]) => {
      if (featuredRes.status === 'fulfilled') setFeatured(unwrap(featuredRes.value) || []);
      if (statsRes.status === 'fulfilled') setStats(unwrap(statsRes.value) || { openJobs: 0, totalJobs: 0 });
      if (categoriesRes.status === 'fulfilled') setCategories(unwrap(categoriesRes.value) || []);
      setRecommended(recommendedRes.status === 'fulfilled' && recommendedRes.value ? unwrap(recommendedRes.value) || [] : []);
    }).finally(() => setLoading(false));
  }, [user, isAdmin]);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/jobs?search=${encodeURIComponent(search.trim())}`);
  };

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 px-4 py-20 text-white sm:px-6 lg:py-28">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-primary-200">Career Opportunities</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Your next role starts here
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-100">
            Search open roles, apply in one click, and track every application — powered by AI match scoring.
          </p>
          <form onSubmit={handleSearch} className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row" role="search">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Job title, skills, or company"
                aria-label="Search jobs"
                className="h-14 rounded-xl border-0 bg-white pl-12 pr-4 text-base text-slate-900 shadow-lg placeholder:text-slate-400 focus-visible:ring-white/60 dark:bg-white"
              />
            </div>
            <Button type="submit" size="lg" className="h-14 rounded-xl bg-white px-8 text-base font-semibold text-primary-700 shadow-lg hover:bg-primary-50">
              Search jobs
            </Button>
          </form>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm text-primary-200">
            {QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => navigate(`/jobs?search=${encodeURIComponent(tag)}`)}
                className="rounded-full border border-white/20 px-4 py-1.5 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { icon: Building2, label: 'Open positions', value: stats.openJobs },
            { icon: Users, label: 'Total listings', value: stats.totalJobs },
            { icon: TrendingUp, label: 'Categories', value: categories.length },
          ].map(({ icon: Icon, label, value }) => (
            <Card key={label} className="py-6">
              <CardContent className="flex flex-col items-center text-center">
                <div className="flex size-12 items-center justify-center rounded-xl bg-accent text-primary">
                  <Icon className="size-6" />
                </div>
                {loading ? (
                  <Skeleton className="mt-3 h-9 w-16" />
                ) : (
                  <p className="mt-3 text-3xl font-bold">{value}</p>
                )}
                <p className="text-sm text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y bg-card py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold">How it works</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
                  <Icon className="size-6" />
                </div>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {(loading || categories.length > 0) && (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <h2 className="text-2xl font-bold">Browse by category</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-28 rounded-full" />)
              : categories.map((cat) => (
                <Button key={cat} asChild variant="outline" className="rounded-full bg-card px-5">
                  <Link to={`/jobs?category=${encodeURIComponent(cat)}`}>{cat}</Link>
                </Button>
              ))}
          </div>
        </section>
      )}

      {user && !isAdmin && recommended.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <SectionHeader title="Recommended for you" subtitle="Based on skills in your profile" to="/jobs" />
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recommended.map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <SectionHeader title="Featured jobs" to="/jobs" />
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <JobCardSkeleton key={i} />)
            : featured.map((job) => <JobCard key={job.id} job={job} />)}
        </div>
        {!loading && featured.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">No featured jobs right now. <Link to="/jobs" className="font-medium text-primary hover:underline">Browse all jobs</Link></p>
        )}
      </section>

      {(!user || isAdmin) && (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          <Card className="flex-col items-center gap-4 bg-gradient-to-r from-primary-50 to-card p-10 text-center dark:from-primary-950/40 sm:flex-row sm:text-left">
            <Shield className="size-10 shrink-0 text-primary" />
            <div className="flex-1">
              <h3 className="text-xl font-bold">Recruiters: post jobs in minutes</h3>
              <p className="mt-1 text-sm text-muted-foreground">AI-generated descriptions, applicant tracking, and real-time messaging.</p>
            </div>
            <Button asChild size="lg" className="shrink-0">
              {isAdmin ? <Link to="/admin/jobs/new">Post a job</Link> : <Link to="/register?type=recruiter">Get started</Link>}
            </Button>
          </Card>
        </section>
      )}
    </div>
  );
}
