import type { PropsWithChildren } from 'react';

interface PageCardProps extends PropsWithChildren {
  muted?: boolean;
}

function PageCard({ muted = false, children }: PageCardProps) {
  return (
    <div
      className={[
        'relative overflow-hidden rounded-xl p-5 shadow-sm ring-1 ring-border-soft/40 transition duration-base max-[640px]:p-4 hover:shadow-md hover:ring-border-soft/60',
        muted
          ? 'bg-surface-subtle/75'
          : 'bg-surface-card',
      ].join(' ')}
    >
      {children}
    </div>
  );
}

export default PageCard;
