import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Bell, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import api, { unwrap } from '../services/api';
import JobCard from '../components/JobCard';
import JobCardSkeleton from '../components/common/JobCardSkeleton';
import Pagination from '../components/common/Pagination';
import EmptyState from '../components/common/EmptyState';
import SelectField from '../components/common/SelectField';
import { useAuth } from '../context/AuthContext';
import { useDebouncedField } from '../hooks/useDebouncedField';

const CATEGORIES = ['Engineering', 'Design', 'Marketing', 'Sales', 'Finance', 'HR', 'Operations', 'Data Science'];
const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Remote', 'Internship'];
const EXPERIENCE = ['Entry', 'Mid-Level', 'Senior', 'Lead'];
const POSTED_WITHIN = [
  { value: 'today', label: 'Today' },
  { value: '3days', label: 'Last 3 days' },
  { value: 'week', label: 'Past week' },
];
const SORT_OPTIONS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'salary_desc', label: 'Salary: high to low' },
  { value: 'salary_asc', label: 'Salary: low to high' },
  { value: 'title', label: 'Title A–Z' },
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

function hasSideFilters(f) {
  return Boolean(f.location || f.jobType || f.experienceLevel || f.category || f.minSalary || f.postedWithin);
}

function FilterField({ id, label, children }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function FilterPanel({ idPrefix, filters, updateFilters, onClearAll, onSaveAlert, showSaveAlert }) {
  const [location, setLocation] = useDebouncedField(filters.location, (v) => updateFilters({ location: v, page: 0 }));
  const [minSalary, setMinSalary] = useDebouncedField(filters.minSalary, (v) => updateFilters({ minSalary: v, page: 0 }));

  return (
    <div className="space-y-5">
      <FilterField id={`${idPrefix}-location`} label="Location">
        <Input
          id={`${idPrefix}-location`}
          placeholder="City or remote"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </FilterField>
      <FilterField id={`${idPrefix}-jobType`} label="Job type">
        <SelectField
          id={`${idPrefix}-jobType`}
          value={filters.jobType}
          onValueChange={(v) => updateFilters({ jobType: v, page: 0 })}
          options={JOB_TYPES}
          emptyLabel="All types"
        />
      </FilterField>
      <FilterField id={`${idPrefix}-experience`} label="Experience">
        <SelectField
          id={`${idPrefix}-experience`}
          value={filters.experienceLevel}
          onValueChange={(v) => updateFilters({ experienceLevel: v, page: 0 })}
          options={EXPERIENCE}
          emptyLabel="All levels"
        />
      </FilterField>
      <FilterField id={`${idPrefix}-category`} label="Category">
        <SelectField
          id={`${idPrefix}-category`}
          value={filters.category}
          onValueChange={(v) => updateFilters({ category: v, page: 0 })}
          options={CATEGORIES}
          emptyLabel="All categories"
        />
      </FilterField>
      <FilterField id={`${idPrefix}-minSalary`} label="Min salary (₹/year)">
        <Input
          id={`${idPrefix}-minSalary`}
          type="number"
          min={0}
          step={50000}
          inputMode="numeric"
          placeholder="e.g. 500000"
          value={minSalary}
          onChange={(e) => setMinSalary(e.target.value)}
        />
      </FilterField>
      {showSaveAlert && (
        <Button type="button" variant="outline" onClick={onSaveAlert} className="w-full">
          <Bell /> Save job alert
        </Button>
      )}
      {hasSideFilters(filters) && (
        <Button type="button" variant="link" onClick={onClearAll} className="h-auto px-0">Clear all filters</Button>
      )}
    </div>
  );
}

export default function Jobs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryKey = searchParams.toString();
  const [result, setResult] = useState({ key: null, jobs: [], total: 0, totalPages: 0 });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const filters = readFilters(searchParams);
  const loading = result.key !== queryKey;
  const { jobs, total, totalPages } = result;

  useEffect(() => {
    const legacyJobId = searchParams.get('job');
    if (legacyJobId) {
      const q = filtersToParams(readFilters(searchParams));
      q.delete('job');
      navigate(`/jobs/${legacyJobId}${q.toString() ? `?${q}` : ''}`, { replace: true });
    }
  }, [searchParams, navigate]);

  const updateFilters = useCallback((patch) => {
    setSearchParams((prev) => filtersToParams({ ...readFilters(prev), ...patch }));
  }, [setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    const query = filtersToParams(readFilters(new URLSearchParams(queryKey)));
    query.set('size', String(PAGE_SIZE));
    api.get(`/api/jobs?${query}`)
      .then((res) => {
        if (cancelled) return;
        const data = unwrap(res);
        setResult({ key: queryKey, jobs: data.content, total: data.totalElements, totalPages: data.totalPages });
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err.response?.data?.message || 'Failed to load jobs');
        setResult({ key: queryKey, jobs: [], total: 0, totalPages: 0 });
      });
    return () => { cancelled = true; };
  }, [queryKey]);

  const [searchDraft, setSearchDraft] = useDebouncedField(filters.search, (v) => updateFilters({ search: v, page: 0 }));

  const activeChips = [
    filters.location && { key: 'location', label: filters.location },
    filters.jobType && { key: 'jobType', label: filters.jobType },
    filters.experienceLevel && { key: 'experienceLevel', label: filters.experienceLevel },
    filters.category && { key: 'category', label: filters.category },
    filters.minSalary && { key: 'minSalary', label: `Min ₹${Number(filters.minSalary).toLocaleString('en-IN')}` },
    filters.postedWithin && { key: 'postedWithin', label: POSTED_WITHIN.find((p) => p.value === filters.postedWithin)?.label || filters.postedWithin },
  ].filter(Boolean);

  const clearAll = () => {
    setSearchParams(new URLSearchParams());
  };

  const setSaved = (jobId, saved) => {
    setResult((prev) => ({ ...prev, jobs: prev.jobs.map((j) => (j.id === jobId ? { ...j, saved } : j)) }));
  };

  const saveJob = async (jobId) => {
    if (!user) return toast.error('Please login to save jobs');
    setSaved(jobId, true);
    try {
      await api.post(`/api/saved-jobs/${jobId}`);
      toast.success('Job saved');
    } catch (err) {
      setSaved(jobId, false);
      toast.error(err.response?.data?.message || 'Failed to save job');
    }
  };

  const unsaveJob = async (jobId) => {
    setSaved(jobId, false);
    try {
      await api.delete(`/api/saved-jobs/${jobId}`);
      toast.success('Removed from saved');
    } catch (err) {
      setSaved(jobId, true);
      toast.error(err.response?.data?.message || 'Failed to remove job');
    }
  };

  const saveJobAlert = async () => {
    if (!user) return toast.error('Please login to save job alerts');
    const f = readFilters(searchParams);
    if (!f.search && !hasSideFilters(f)) {
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

  const panelProps = {
    filters,
    updateFilters,
    onClearAll: clearAll,
    onSaveAlert: saveJobAlert,
    showSaveAlert: !!user,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Find jobs</h1>
          <p className="mt-1 text-muted-foreground" aria-live="polite">
            {loading ? 'Searching…' : `${total.toLocaleString()} open ${total === 1 ? 'position' : 'positions'}`}
          </p>
        </div>
        <div className="flex w-full max-w-md items-center gap-2 sm:w-auto">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Job title, skills, company…"
              aria-label="Search jobs"
              className="h-10 pl-10 sm:w-80"
            />
          </div>
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" size="icon" className="relative size-10 lg:hidden" aria-label="Open filters">
                <SlidersHorizontal />
                {activeChips.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {activeChips.length}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>Narrow down jobs by location, type and more.</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6">
                <FilterPanel idPrefix="mobile" {...panelProps} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {activeChips.map(({ key, label }) => (
            <Badge key={key} className="gap-1 bg-accent py-1 pl-3 pr-1 text-accent-foreground">
              {label}
              <button
                type="button"
                onClick={() => updateFilters({ [key]: '', page: 0 })}
                className="rounded-full p-0.5 hover:bg-primary/10"
                aria-label={`Remove ${label}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <Button type="button" variant="link" size="sm" onClick={clearAll} className="h-auto px-1 text-xs text-muted-foreground">Clear all</Button>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <Card className="hidden h-fit p-5 lg:sticky lg:top-36 lg:block">
          <FilterPanel idPrefix="desktop" {...panelProps} />
        </Card>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Posted within">
              <span className="text-sm text-muted-foreground">Posted:</span>
              {POSTED_WITHIN.map(({ value, label }) => {
                const active = filters.postedWithin === value;
                return (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={active ? 'default' : 'secondary'}
                    aria-pressed={active}
                    onClick={() => updateFilters({ postedWithin: active ? '' : value, page: 0 })}
                    className="h-7 rounded-full"
                  >
                    {label}
                  </Button>
                );
              })}
              {filters.postedWithin && (
                <Button type="button" variant="link" size="sm" onClick={() => updateFilters({ postedWithin: '', page: 0 })} className="h-auto px-1 text-xs text-muted-foreground">
                  Show all
                </Button>
              )}
            </div>
            <SelectField
              value={filters.sort}
              onValueChange={(v) => updateFilters({ sort: v, page: 0 })}
              options={SORT_OPTIONS}
              aria-label="Sort jobs"
              className="w-auto min-w-[190px]"
            />
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 6 }).map((_, i) => <JobCardSkeleton key={i} />)}</div>
          ) : jobs.length === 0 ? (
            <EmptyState icon={Briefcase} title="No jobs match your search" description="Try broadening your filters or search for different keywords." actionLabel="Clear filters" onAction={clearAll} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} onSave={user ? saveJob : null} onUnsave={user ? unsaveJob : null} />
              ))}
            </div>
          )}

          {!loading && jobs.length > 0 && (
            <div className="mt-8">
              <Pagination
                page={filters.page}
                totalPages={totalPages}
                onPageChange={(p) => {
                  updateFilters({ page: p });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
