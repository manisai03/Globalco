import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(0, page - 2);
  const end = Math.min(totalPages - 1, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
      <button
        type="button"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
        className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      {start > 0 && (
        <>
          <button type="button" onClick={() => onPageChange(0)} className="pagination-btn">1</button>
          {start > 1 && <span className="px-2 text-slate-400">…</span>}
        </>
      )}
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPageChange(p)}
          className={`pagination-btn ${p === page ? 'pagination-btn-active' : ''}`}
        >
          {p + 1}
        </button>
      ))}
      {end < totalPages - 1 && (
        <>
          {end < totalPages - 2 && <span className="px-2 text-slate-400">…</span>}
          <button type="button" onClick={() => onPageChange(totalPages - 1)} className="pagination-btn">{totalPages}</button>
        </>
      )}
      <button
        type="button"
        disabled={page >= totalPages - 1}
        onClick={() => onPageChange(page + 1)}
        className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
        aria-label="Next page"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </nav>
  );
}
