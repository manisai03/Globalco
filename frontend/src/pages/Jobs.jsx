import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { unwrap } from '../services/api';
import JobCard from '../components/JobCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Jobs() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    search: params.get('search') || '',
    location: params.get('location') || '',
    jobType: params.get('jobType') || '',
    experienceLevel: params.get('experienceLevel') || '',
    category: params.get('category') || '',
    minSalary: params.get('minSalary') || '',
    sort: params.get('sort') || '',
    page: 0,
  });

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v !== '' && v !== 0) query.set(k, v); });
      const res = await api.get(`/api/jobs?${query}`);
      const data = unwrap(res);
      setJobs(data.content);
      setTotal(data.totalElements);
    } catch {
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, [filters]);

  const applyFilters = (e) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, page: 0 }));
  };

  const saveJob = async (jobId) => {
    if (!user) return toast.error('Please login to save jobs');
    await api.post(`/api/saved-jobs/${jobId}`);
    toast.success('Job saved');
    fetchJobs();
  };

  const unsaveJob = async (jobId) => {
    await api.delete(`/api/saved-jobs/${jobId}`);
    toast.success('Removed from saved');
    fetchJobs();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold">Browse Jobs</h1>
      <p className="mt-1 text-slate-500">{total} positions found</p>

      <form onSubmit={applyFilters} className="mt-8 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-4">
        <input placeholder="Search..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
        <input placeholder="Location" value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })} className="rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
        <select value={filters.jobType} onChange={(e) => setFilters({ ...filters, jobType: e.target.value })} className="rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
          <option value="">All Types</option>
          {['Full-time', 'Part-time', 'Contract', 'Remote', 'Internship'].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filters.experienceLevel} onChange={(e) => setFilters({ ...filters, experienceLevel: e.target.value })} className="rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
          <option value="">All Experience</option>
          {['Entry', 'Mid-Level', 'Senior', 'Lead'].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
          <option value="">All Categories</option>
          {['Engineering', 'Design', 'Marketing', 'Sales', 'Finance', 'HR', 'Operations', 'Data Science'].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="number" placeholder="Min Salary" value={filters.minSalary} onChange={(e) => setFilters({ ...filters, minSalary: e.target.value })} className="rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
        <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })} className="rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
          <option value="">Newest</option>
          <option value="salary_desc">Salary: High to Low</option>
          <option value="salary_asc">Salary: Low to High</option>
          <option value="title">Title A-Z</option>
        </select>
        <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700">Apply Filters</button>
      </form>

      {loading ? (
        <div className="mt-12 flex justify-center"><LoadingSpinner /></div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onSave={user ? saveJob : null} onUnsave={user ? unsaveJob : null} />
          ))}
        </div>
      )}

      {!loading && jobs.length === 0 && (
        <p className="mt-12 text-center text-slate-500">No jobs match your filters.</p>
      )}
    </div>
  );
}
