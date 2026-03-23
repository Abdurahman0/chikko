import type { PropsWithChildren } from 'react';

interface PageCardProps extends PropsWithChildren {
  muted?: boolean;
}

function PageCard({ muted = false, children }: PageCardProps) {
  return (
    <div
      className={[
        'relative overflow-hidden rounded-[20px] border p-5 shadow-sm backdrop-blur-[12px] max-[640px]:p-4',
        'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px',
        'before:bg-border-accent/40 before:content-[""]',
        muted
          ? 'border-border-subtle bg-surface-muted shadow-sm'
          : 'border-border-soft bg-surface-card',
      ].join(' ')}
    >
      {children}
    </div>
  );
}

export default PageCard;
