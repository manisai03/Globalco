import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Bell } from 'lucide-react';
import api, { unwrap } from '../services/api';
import JobCard from '../components/JobCard';
import JobListItem from '../components/JobListItem';
import JobPreviewPanel from '../components/JobPreviewPanel';
import JobCardSkeleton from '../components/ui/JobCardSkeleton';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const CATEGORIES = ['Engineering', 'Design', 'Marketing', 'Sales', 'Finance', 'HR', 'Operations', 'Data Science'];
const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Remote', 'Internship'];
const EXPERIENCE = ['Entry', 'Mid-Level', 'Senior', 'Lead'];
const POSTED_WITHIN = [
  { value: 'today', label: 'Today' },
  { value: '3days', label: 'Last 3 days' },
  { value: 'week', label: 'Past week' },
];
const PAGE_SIZE = 12;

function readFilters(params) {
  return {
    search: params.get('search') || '',
    location: params.get('location') || '',
    jobType: params.get('jobType') || '',
    experienceLevel: params.get('experienceLevel') || '',
    category: params.get('category') || '',
    minSalary: params.get('minSalary') || '',
    postedWithin: params.get('postedWithin') || '',
    sort: params.get('sort') || 'recent',
    page: Number(params.get('page') || 0),
    job: params.get('job') || '',
  };
}

function filtersToParams(filters) {
  const q = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined && !(k === 'page' && v === 0)) {
      q.set(k, String(v));
    }
  });
  return q;
}

export default function Jobs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchDraft, setSearchDraft] = useState(searchParams.get('search') || '');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [splitView, setSplitView] = useState(false);

  const filters = readFilters(searchParams);
  const selectedJobId = filters.job ? Number(filters.job) : null;

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    const update = () => setSplitView(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const updateFilters = useCallback((patch) => {
    const next = { ...readFilters(searchParams), ...patch };
    if (!patch.job && (patch.search !== undefined || patch.location !== undefined || patch.page !== undefined)) {
      next.job = '';
    }
    setSearchParams(filtersToParams(next));
  }, [searchParams, setSearchParams]);

  const selectJob = (jobId) => updateFilters({ job: String(jobId) });

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const f = readFilters(searchParams);
      const query = filtersToParams({ ...f, size: PAGE_SIZE });
      query.delete('job');
      query.set('size', String(PAGE_SIZE));
      const res = await api.get(`/api/jobs?${query}`);
      const data = unwrap(res);
      setJobs(data.content);
      setTotal(data.totalElements);
      setTotalPages(data.totalPages);

      if (splitView && data.content.length > 0) {
        const current = searchParams.get('job');
        const stillVisible = current && data.content.some((j) => String(j.id) === current);
        if (!stillVisible) {
          const next = { ...readFilters(searchParams), job: String(data.content[0].id) };
          setSearchParams(filtersToParams(next), { replace: true });
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [searchParams, splitView, setSearchParams]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  useEffect(() => {
    setSearchDraft(searchParams.get('search') || '');
  }, [searchParams]);

  useEffect(() => {
    const t = setTimeout(() => {
      const current = searchParams.get('search') || '';
      if (searchDraft !== current) {
        updateFilters({ search: searchDraft, page: 0 });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchDraft, searchParams, updateFilters]);

  const activeChips = [
    filters.location && { key: 'location', label: filters.location },
    filters.jobType && { key: 'jobType', label: filters.jobType },
    filters.experienceLevel && { key: 'experienceLevel', label: filters.experienceLevel },
    filters.category && { key: 'category', label: filters.category },
    filters.minSalary && { key: 'minSalary', label: `Min ₹${filters.minSalary}` },
    filters.postedWithin && { key: 'postedWithin', label: POSTED_WITHIN.find((p) => p.value === filters.postedWithin)?.label || filters.postedWithin },
  ].filter(Boolean);

  const clearAll = () => {
    setSearchDraft('');
    setSearchParams(new URLSearchParams());
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

  const saveJobAlert = async () => {
    if (!user) return toast.error('Please login to save job alerts');
    const f = readFilters(searchParams);
    if (!f.search && !f.location && !f.jobType && !f.experienceLevel && !f.category && !f.minSalary && !f.postedWithin) {
      return toast.error('Add at least one filter before saving an alert');
    }
    try {
      await api.post('/api/saved-searches', {
        search: f.search || null,
        location: f.location || null,
        jobType: f.jobType || null,
        experienceLevel: f.experienceLevel || null,
        category: f.category || null,
        minSalary: f.minSalary ? Number(f.minSalary) : null,
        sort: f.sort || 'recent',
      });
      toast.success('Job alert saved — view in Dashboard → Job Alerts');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save alert');
    }
  };

  const FilterPanel = ({ className = '' }) => (
    <aside className={`space-y-5 ${className}`}>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</label>
        <input
          className="input-field mt-2"
          placeholder="City or remote"
          value={filters.location}
          onChange={(e) => updateFilters({ location: e.target.value, page: 0 })}
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Job type</label>
        <select className="input-field mt-2" value={filters.jobType} onChange={(e) => updateFilters({ jobType: e.target.value, page: 0 })}>
          <option value="">All types</option>
          {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Experience</label>
        <select className="input-field mt-2" value={filters.experienceLevel} onChange={(e) => updateFilters({ experienceLevel: e.target.value, page: 0 })}>
          <option value="">All levels</option>
          {EXPERIENCE.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</label>
        <select className="input-field mt-2" value={filters.category} onChange={(e) => updateFilters({ category: e.target.value, page: 0 })}>
          <option value="">All categories</option>
          {CATEGORIES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Min salary (₹/year)</label>
        <input type="number" className="input-field mt-2" placeholder="e.g. 500000" value={filters.minSalary} onChange={(e) => updateFilters({ minSalary: e.target.value, page: 0 })} />
      </div>
      {user && (
        <button type="button" onClick={saveJobAlert} className="btn-secondary w-full gap-2">
          <Bell className="h-4 w-4" /> Save job alert
        </button>
      )}
      {(filters.location || filters.jobType || filters.experienceLevel || filters.category || filters.minSalary || filters.postedWithin) && (
        <button type="button" onClick={clearAll} className="text-sm font-medium text-primary-600 hover:underline">Clear all filters</button>
      )}
    </aside>
  );

  const ResultsList = () => {
    if (loading) {
      return splitView ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <JobCardSkeleton key={i} />)}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 6 }).map((_, i) => <JobCardSkeleton key={i} />)}</div>
      );
    }
    if (jobs.length === 0) {
      return <EmptyState title="No jobs match your search" description="Try broadening your filters or search for different keywords." actionLabel="Clear filters" onAction={clearAll} />;
    }
    if (splitView) {
      return (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobListItem
              key={job.id}
              job={job}
              selected={selectedJobId === job.id}
              onSelect={selectJob}
              onSave={user ? saveJob : null}
              onUnsave={user ? unsaveJob : null}
            />
          ))}
        </div>
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} onSave={user ? saveJob : null} onUnsave={user ? unsaveJob : null} />
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Find jobs</h1>
          <p className="mt-1 text-slate-500">{loading ? 'Searching…' : `${total.toLocaleString()} open ${total === 1 ? 'position' : 'positions'}`}</p>
        </div>
        <div className="flex w-full max-w-md items-center gap-2 sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)} placeholder="Job title, skills, company…" className="input-field pl-10" />
          </div>
          <button type="button" className="btn-secondary lg:hidden" onClick={() => setShowMobileFilters((v) => !v)} aria-label="Toggle filters">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {activeChips.map(({ key, label }) => (
            <span key={key} className="filter-chip">
              {label}
              <button type="button" onClick={() => updateFilters({ [key]: '', page: 0 })} aria-label={`Remove ${label}`}><X className="h-3 w-3" /></button>
            </span>
          ))}
          <button type="button" onClick={clearAll} className="text-xs text-slate-500 hover:text-primary-600">Clear all</button>
        </div>
      )}

      <div className={`mt-8 grid gap-8 ${splitView ? 'xl:grid-cols-[220px_minmax(320px,380px)_1fr]' : 'lg:grid-cols-[240px_1fr]'}`}>
        <FilterPanel className={`card p-5 ${showMobileFilters ? 'block' : 'hidden lg:block'}`} />

        <div className={splitView ? 'min-w-0' : ''}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-500">Posted:</span>
              {POSTED_WITHIN.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateFilters({ postedWithin: filters.postedWithin === value ? '' : value, page: 0 })}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                    filters.postedWithin === value
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
              {filters.postedWithin && (
                <button type="button" onClick={() => updateFilters({ postedWithin: '', page: 0 })} className="text-xs text-slate-500 hover:text-primary-600">
                  Show all
                </button>
              )}
            </div>
            <select className="input-field w-auto min-w-[180px]" value={filters.sort} onChange={(e) => updateFilters({ sort: e.target.value, page: 0 })}>
              <option value="recent">Most recent</option>
              <option value="salary_desc">Salary: high to low</option>
              <option value="salary_asc">Salary: low to high</option>
              <option value="title">Title A–Z</option>
            </select>
          </div>
          <ResultsList />
          {!loading && jobs.length > 0 && (
            <div className="mt-8">
              <Pagination page={filters.page} totalPages={totalPages} onPageChange={(p) => updateFilters({ page: p })} />
            </div>
          )}
        </div>

        {splitView && (
          <div className="hidden xl:block">
            <JobPreviewPanel jobId={selectedJobId} onApplied={fetchJobs} />
          </div>
        )}
      </div>
    </div>
  );
}
