import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

function PageButton({ page, active, onPageChange }) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? 'default' : 'outline'}
      className="min-w-9"
      aria-current={active ? 'page' : undefined}
      onClick={() => onPageChange(page)}
    >
      {page + 1}
    </Button>
  );
}

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(0, page - 2);
  const end = Math.min(totalPages - 1, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav className="flex flex-wrap items-center justify-center gap-1" aria-label="Pagination">
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft />
      </Button>
      {start > 0 && (
        <>
          <PageButton page={0} onPageChange={onPageChange} />
          {start > 1 && <span className="px-2 text-muted-foreground">…</span>}
        </>
      )}
      {pages.map((p) => (
        <PageButton key={p} page={p} active={p === page} onPageChange={onPageChange} />
      ))}
      {end < totalPages - 1 && (
        <>
          {end < totalPages - 2 && <span className="px-2 text-muted-foreground">…</span>}
          <PageButton page={totalPages - 1} onPageChange={onPageChange} />
        </>
      )}
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        disabled={page >= totalPages - 1}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight />
      </Button>
    </nav>
  );
}
