interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
}

const PAGINATION_BUTTON_CLASS_NAME = [
  'inline-flex min-h-[38px] min-w-[96px] items-center justify-center rounded-xl border border-border-soft',
  'bg-surface-card px-3.5 text-sm font-semibold text-text-primary shadow-sm transition duration-fast',
  'hover:border-border-accent hover:bg-surface-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
  'disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none max-[820px]:flex-1',
].join(' ');

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: PaginationProps) {
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <nav
      className="pagination flex flex-wrap items-center justify-between gap-3 px-0.5"
      aria-label="Pagination"
    >
      <div className="pagination__summary flex w-full flex-wrap items-center gap-2 text-sm font-medium text-text-secondary min-[821px]:w-auto">
        <span className="pagination__current inline-flex min-h-7 items-center rounded-pill border border-border-accent bg-primary/12 px-2.5 text-[12px] font-semibold text-text-accent">
          Page {currentPage}
        </span>
        <span className="text-text-primary">of {Math.max(totalPages, 1)}</span>
        {typeof totalItems === 'number' ? (
          <span>{totalItems} total items</span>
        ) : null}
      </div>
      <div className="pagination__actions ml-auto flex w-full items-center gap-3 min-[821px]:ml-auto min-[821px]:w-auto">
        <button
          type="button"
          className={PAGINATION_BUTTON_CLASS_NAME}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
        >
          Previous
        </button>
        <button
          type="button"
          className={PAGINATION_BUTTON_CLASS_NAME}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
        >
          Next
        </button>
      </div>
    </nav>
  );
}

export default Pagination;
