import type { PropsWithChildren, ReactNode } from 'react';

interface FilterBarProps extends PropsWithChildren {
  actions?: ReactNode;
}

function FilterBar({ children, actions }: FilterBarProps) {
  return (
    <div
      className={[
        'filter-bar relative flex flex-wrap items-end justify-between gap-3 overflow-visible rounded-[20px] border border-border-soft',
        'bg-surface-card p-4 shadow-sm backdrop-blur-[12px]',
        'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px',
        'before:bg-border-accent/40 before:content-[""]',
      ].join(' ')}
    >
      <div className="filter-bar__filters flex min-w-0 flex-1 flex-wrap items-end gap-2.5">
        {children}
      </div>
      {actions ? (
        <div className="filter-bar__actions ml-auto flex min-w-0 flex-wrap items-center gap-2.5 max-[820px]:ml-0 max-[820px]:w-full max-[820px]:justify-start">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export default FilterBar;
