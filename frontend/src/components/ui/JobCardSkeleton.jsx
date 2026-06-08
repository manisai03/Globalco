export default function JobCardSkeleton() {
  return (
    <div className="card animate-pulse p-5">
      <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="mt-2 h-4 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
      <div className="mt-4 flex gap-3">
        <div className="h-4 w-24 rounded bg-slate-100 dark:bg-slate-800" />
        <div className="h-4 w-20 rounded bg-slate-100 dark:bg-slate-800" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-6 w-16 rounded-full bg-slate-100 dark:bg-slate-800" />
        <div className="h-6 w-20 rounded-full bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  );
}
