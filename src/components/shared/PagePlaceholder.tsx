import type { AppRouteConfig } from '../../config/routes';
import {
  EmptyState,
  LoadingState,
  PageCard,
  PageHeader,
  PageLayout,
  PageSection,
} from './page';

interface PagePlaceholderProps {
  route: AppRouteConfig;
  summary: string;
  sectionTitle?: string;
  sectionDescription?: string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
}

function PagePlaceholder({
  route,
  summary,
  sectionTitle = 'Page Foundation',
  sectionDescription = 'This placeholder demonstrates the shared page composition pattern for future module pages.',
  emptyStateTitle = 'No module-specific UI yet',
  emptyStateDescription = 'Future tasks can replace this empty state with real content while keeping the same layout, section, and card structure.',
}: PagePlaceholderProps) {
  const content = (
    <PageLayout
      header={
        <PageHeader
          eyebrow={route.access === 'public' ? 'Public Route' : 'Protected Route'}
          title={route.title}
          subtitle={summary}
          actions={
            <span className="inline-flex rounded-pill border border-border-accent bg-primary-soft px-[10px] py-[6px] font-mono text-[0.95rem] text-text-accent">
              {route.path}
            </span>
          }
        />
      }
    >
      <PageSection title={sectionTitle} description={sectionDescription}>
        <PageCard>
          <dl className="mt-7 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-4">
            <div className="rounded-lg border border-border-subtle bg-background-subtle p-4">
              <dt className="text-[0.85rem] text-text-muted">Route ID</dt>
              <dd className="mt-2 text-[1.8rem] font-bold text-text-primary">
                {route.id}
              </dd>
            </div>
            <div className="rounded-lg border border-border-subtle bg-background-subtle p-4">
              <dt className="text-[0.85rem] text-text-muted">Navigation</dt>
              <dd className="mt-2 text-[1.8rem] font-bold text-text-primary">
                {route.showInNavigation ? 'Listed' : 'Hidden'}
              </dd>
            </div>
            <div className="rounded-lg border border-border-subtle bg-background-subtle p-4">
              <dt className="text-[0.85rem] text-text-muted">Access</dt>
              <dd className="mt-2 text-[1.8rem] font-bold text-text-primary">
                {route.access}
              </dd>
            </div>
          </dl>
          {route.allowedRoles ? (
            <p className="mt-4 text-text-secondary">
              Allowed roles: <strong>{route.allowedRoles.join(', ')}</strong>
            </p>
          ) : null}
          {route.accessStrategy ? (
            <p className="mt-4 text-text-secondary">
              Access strategy: <strong>{route.accessStrategy}</strong>
            </p>
          ) : null}
        </PageCard>
      </PageSection>

      <PageSection title="Next Page State">
        <EmptyState
          title={emptyStateTitle}
          description={emptyStateDescription}
        />
      </PageSection>

      <PageSection title="Loading Pattern">
        <LoadingState
          title="Future data load placeholder"
          description="When services or hooks are connected later, this loading state is the intended shared fallback while data is resolving."
        />
      </PageSection>
    </PageLayout>
  );

  if (route.access === 'public') {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        {content}
      </main>
    );
  }

  return content;
}

export default PagePlaceholder;
