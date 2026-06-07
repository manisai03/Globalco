import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, Building2, TrendingUp } from 'lucide-react';
import api, { unwrap } from '../services/api';
import JobCard from '../components/JobCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [stats, setStats] = useState({ openJobs: 0, totalJobs: 0 });
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/jobs/featured'),
      api.get('/api/public/stats'),
      api.get('/api/jobs/categories'),
    ]).then(([f, s, c]) => {
      setFeatured(unwrap(f));
      setStats(unwrap(s));
      setCategories(unwrap(c));
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 px-4 py-20 text-white sm:px-6">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Find Your Dream Job at Globalco
          </h1>
          <p className="mt-4 text-lg text-primary-100">
            AI-powered recruitment platform — Hitech City, Hyderabad
          </p>
          <form
            onSubmit={(e) => { e.preventDefault(); window.location.href = `/jobs?search=${encodeURIComponent(search)}`; }}
            className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search jobs, skills, companies..."
                className="w-full rounded-xl border-0 py-4 pl-12 pr-4 text-slate-900 shadow-lg focus:ring-2 focus:ring-white"
              />
            </div>
            <button type="submit" className="rounded-xl bg-white px-8 py-4 font-semibold text-primary-700 shadow-lg hover:bg-primary-50">
              Search Jobs
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { icon: Building2, label: 'Open Positions', value: stats.openJobs },
            { icon: Users, label: 'Total Listings', value: stats.totalJobs },
            { icon: TrendingUp, label: 'Categories', value: categories.length },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
              <Icon className="mx-auto h-8 w-8 text-primary-600" />
              <p className="mt-2 text-3xl font-bold">{value}+</p>
              <p className="text-sm text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h2 className="text-2xl font-bold">Job Categories</h2>
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

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Featured Jobs</h2>
          <Link to="/jobs" className="text-sm font-medium text-primary-600 hover:underline">View all →</Link>
        </div>
        {loading ? (
          <div className="mt-8 flex justify-center"><LoadingSpinner /></div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        )}
      </section>
    </div>
  );
}
