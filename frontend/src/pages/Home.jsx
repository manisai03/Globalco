import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Users, Building2, TrendingUp, Zap, Shield, BarChart3 } from 'lucide-react';
import api, { unwrap } from '../services/api';
import JobCard from '../components/JobCard';
import JobCardSkeleton from '../components/ui/JobCardSkeleton';
import { useAuth } from '../context/AuthContext';

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
    const requests = [
      api.get('/api/jobs/featured'),
      api.get('/api/public/stats'),
      api.get('/api/jobs/categories'),
    ];
    if (user && !isAdmin) {
      requests.push(api.get('/api/jobs/recommended'));
    }
    Promise.all(requests).then((results) => {
      setFeatured(unwrap(results[0]));
      setStats(unwrap(results[1]));
      setCategories(unwrap(results[2]));
      if (results[3]) setRecommended(unwrap(results[3]));
    }).finally(() => setLoading(false));
  }, [user, isAdmin]);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/jobs?search=${encodeURIComponent(search)}`);
  };

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 px-4 py-20 text-white sm:px-6 lg:py-28">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-primary-200">Globalco Careers</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Your next role starts here
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-100">
            Search thousands of openings, apply in one click, and track every application — powered by AI match scoring.
          </p>
          <form onSubmit={handleSearch} className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Job title, skills, or company"
                className="w-full rounded-xl border-0 py-4 pl-12 pr-4 text-slate-900 shadow-lg focus:ring-2 focus:ring-white"
              />
            </div>
            <button type="submit" className="rounded-xl bg-white px-8 py-4 font-semibold text-primary-700 shadow-lg transition hover:bg-primary-50">
              Search jobs
            </button>
          </form>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm text-primary-200">
            {['Remote', 'Engineering', 'Full-time', 'Hyderabad'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => navigate(`/jobs?search=${encodeURIComponent(tag)}`)}
                className="rounded-full border border-white/20 px-4 py-1.5 transition hover:bg-white/10"
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
            <div key={label} className="card p-6 text-center">
              <Icon className="mx-auto h-8 w-8 text-primary-600" />
              <p className="mt-2 text-3xl font-bold">{value}+</p>
              <p className="text-sm text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-14 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold">How it works</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              { icon: Search, title: 'Discover', desc: 'Filter by role, salary, location, and experience — like Naukri or LinkedIn.' },
              { icon: Zap, title: 'Easy Apply', desc: 'One-click apply with your profile resume and AI-powered match insights.' },
              { icon: BarChart3, title: 'Track', desc: 'Monitor application status, chat with recruiters, and manage saved jobs.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-900/30">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h2 className="text-2xl font-bold">Browse by category</h2>
        <div className="mt-6 flex flex-wrap gap-3">
          {categories.map((cat) => (
            <Link
              key={cat}
              to={`/jobs?category=${encodeURIComponent(cat)}`}
              className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-medium transition hover:border-primary-400 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-900"
            >
              {cat}
            </Link>
          ))}
        </div>
      </section>

      {user && !isAdmin && recommended.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Recommended for you</h2>
              <p className="mt-1 text-sm text-slate-500">Based on skills in your profile</p>
            </div>
            <Link to="/jobs" className="text-sm font-medium text-primary-600 hover:underline">View all →</Link>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recommended.map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Featured jobs</h2>
          <Link to="/jobs" className="text-sm font-medium text-primary-600 hover:underline">View all →</Link>
        </div>
        {loading ? (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <JobCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="card flex flex-col items-center gap-4 bg-gradient-to-r from-primary-50 to-white p-10 text-center dark:from-primary-950/40 dark:to-slate-900 sm:flex-row sm:text-left">
          <Shield className="h-10 w-10 shrink-0 text-primary-600" />
          <div className="flex-1">
            <h3 className="text-xl font-bold">Recruiters: post jobs in minutes</h3>
            <p className="mt-1 text-sm text-slate-500">AI-generated descriptions, applicant tracking, and real-time messaging.</p>
          </div>
          <Link to="/register" className="btn-primary shrink-0">Get started</Link>
        </div>
      </section>
    </div>
  );
}
