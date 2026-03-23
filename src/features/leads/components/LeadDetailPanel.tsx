import { useEffect, useState } from 'react';
import {
  LEAD_STATUS_LABELS,
  PLATFORM_CHANNEL_LABELS,
} from '../../../constants';
import { StatusBadge } from '../../../components/shared/data';
import AppIcon from '../../../components/shared/icons/AppIcon';
import { EmptyState, LoadingState, PageCard } from '../../../components/shared/page';
import { services } from '../../../services';
import type { EntityId, Lead } from '../../../types/domain';

interface LeadDetailPanelProps {
  leadId: EntityId;
  onClose: () => void;
}

const detailSectionTitleClassName =
  'm-0 text-[1rem] font-semibold leading-tight text-text-primary';

const detailSectionDescriptionClassName =
  'mt-1.5 max-w-[52ch] text-[13px] leading-5 text-text-secondary';

const detailListRowBaseClassName =
  'm-0 flex flex-col items-start justify-between gap-2 border-b border-border-subtle pb-3 min-[641px]:flex-row min-[641px]:items-start min-[641px]:gap-4';

const detailChipClassName =
  'inline-flex min-h-8 items-center gap-2 rounded-pill border border-border-soft bg-background-elevated/88 px-3 text-[12px] font-semibold text-text-secondary shadow-sm';

const detailSoftChipClassName =
  'inline-flex min-h-8 items-center gap-2 rounded-pill border border-border-soft bg-background-subtle/90 px-3 text-[12px] font-semibold text-text-secondary shadow-sm';

function formatDateTime(timestamp?: string): string {
  if (!timestamp) {
    return 'Unavailable';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

function LeadDetailPanel({ leadId, onClose }: LeadDetailPanelProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadLead() {
      setIsLoading(true);
      setHasError(false);

      try {
        const nextLead = await services.leads.getById(leadId);

        if (!isActive) {
          return;
        }

        setLead(nextLead);
      } catch {
        if (!isActive) {
          return;
        }

        setHasError(true);
        setLead(null);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadLead();

    return () => {
      isActive = false;
    };
  }, [leadId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-background-overlay/80 backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="h-full w-full overflow-y-auto border-l border-border-soft bg-surface-card p-4 shadow-md min-[641px]:max-w-[440px] min-[641px]:p-5"
        onClick={(event) => event.stopPropagation()}
        aria-label="Lead details"
      >
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle pb-4">
          <div className="min-w-0">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
              Lead details
            </p>
            <h2 className="m-0 text-[clamp(1.2rem,2.8vw,1.55rem)] leading-[1.08] text-text-primary [overflow-wrap:anywhere]">
              {lead?.fullName ?? 'Lead details'}
            </h2>
            {!isLoading && lead ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={detailSoftChipClassName}>
                  <AppIcon name="chat" className="h-3.5 w-3.5" aria-hidden="true" />
                  {PLATFORM_CHANNEL_LABELS[lead.source]}
                </span>
                <span className={detailChipClassName}>
                  <AppIcon name="user" className="h-3.5 w-3.5" aria-hidden="true" />
                  {lead.assignedOperator?.fullName ?? 'Unassigned'}
                </span>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border-soft bg-background-elevated/88 text-text-primary shadow-sm transition duration-fast hover:bg-surface-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
            onClick={onClose}
            aria-label="Close lead details"
          >
            <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid min-h-full min-w-0 gap-4">
          {isLoading ? (
            <LoadingState
              title="Loading lead details"
              description="Lead detail data is being requested from the active leads service."
            />
          ) : null}

          {!isLoading && (hasError || !lead) ? (
            <EmptyState
              title="Lead details are unavailable"
              description="The selected lead could not be loaded from the service layer."
            />
          ) : null}

          {!isLoading && lead ? (
            <>
              <PageCard>
                <div className="grid gap-5">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-subtle pb-3.5">
                    <div>
                      <h3 className={detailSectionTitleClassName}>{lead.fullName}</h3>
                      <p className={detailSectionDescriptionClassName}>
                        {lead.username ?? lead.contact.username ?? 'No public handle'}
                      </p>
                    </div>
                    <StatusBadge
                      status={lead.status}
                      label={LEAD_STATUS_LABELS[lead.status]}
                    />
                  </div>

                  <dl className="m-0 grid gap-3.5">
                    <div className={detailListRowBaseClassName}>
                      <dt className="m-0 text-sm text-text-secondary">Phone</dt>
                      <dd className="m-0 text-sm font-semibold text-text-primary min-[641px]:text-right">
                        {lead.contact.phone ?? 'Unavailable'}
                      </dd>
                    </div>
                    <div className={detailListRowBaseClassName}>
                      <dt className="m-0 text-sm text-text-secondary">Email</dt>
                      <dd className="m-0 text-sm font-semibold text-text-primary min-[641px]:text-right">
                        {lead.contact.email ?? 'Unavailable'}
                      </dd>
                    </div>
                    <div className={detailListRowBaseClassName}>
                      <dt className="m-0 text-sm text-text-secondary">Source</dt>
                      <dd className="m-0 text-sm font-semibold text-text-primary min-[641px]:text-right">
                        {PLATFORM_CHANNEL_LABELS[lead.source]}
                      </dd>
                    </div>
                    <div className="m-0 flex flex-col items-start justify-between gap-2 min-[641px]:flex-row min-[641px]:items-start min-[641px]:gap-4">
                      <dt className="m-0 text-sm text-text-secondary">Owner</dt>
                      <dd className="m-0 text-sm font-semibold text-text-primary min-[641px]:text-right">
                        {lead.assignedOperator?.fullName ?? 'Unassigned'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </PageCard>

              <PageCard>
                <div className="grid gap-5">
                  <div className="grid gap-2">
                    <h3 className={detailSectionTitleClassName}>Activity</h3>
                    <p className={detailSectionDescriptionClassName}>
                      Recent timestamps and response signals.
                    </p>
                  </div>

                  <dl className="m-0 grid gap-3.5">
                    <div className={detailListRowBaseClassName}>
                      <dt className="m-0 text-sm text-text-secondary">Created</dt>
                      <dd className="m-0 text-sm font-semibold text-text-primary min-[641px]:text-right">
                        {formatDateTime(lead.createdAt)}
                      </dd>
                    </div>
                    <div className={detailListRowBaseClassName}>
                      <dt className="m-0 text-sm text-text-secondary">Updated</dt>
                      <dd className="m-0 text-sm font-semibold text-text-primary min-[641px]:text-right">
                        {formatDateTime(lead.updatedAt)}
                      </dd>
                    </div>
                    <div className={detailListRowBaseClassName}>
                      <dt className="m-0 text-sm text-text-secondary">Last contact</dt>
                      <dd className="m-0 text-sm font-semibold text-text-primary min-[641px]:text-right">
                        {formatDateTime(lead.lastContactAt)}
                      </dd>
                    </div>
                    <div className={detailListRowBaseClassName}>
                      <dt className="m-0 text-sm text-text-secondary">Last message</dt>
                      <dd className="m-0 text-sm font-semibold text-text-primary min-[641px]:text-right">
                        {formatDateTime(lead.lastMessageAt)}
                      </dd>
                    </div>
                    <div className={detailListRowBaseClassName}>
                      <dt className="m-0 text-sm text-text-secondary">Lead replied</dt>
                      <dd className="m-0 text-sm font-semibold text-text-primary min-[641px]:text-right">
                        {lead.replied ? 'Yes' : 'No'}
                      </dd>
                    </div>
                    <div className="m-0 flex flex-col items-start justify-between gap-2 min-[641px]:flex-row min-[641px]:items-start min-[641px]:gap-4">
                      <dt className="m-0 text-sm text-text-secondary">DM sent</dt>
                      <dd className="m-0 text-sm font-semibold text-text-primary min-[641px]:text-right">
                        {lead.dmSent ? 'Yes' : 'No'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </PageCard>

              <PageCard>
                <div className="grid gap-5">
                  <div className="grid gap-2">
                    <h3 className={detailSectionTitleClassName}>Notes</h3>
                    <p className={detailSectionDescriptionClassName}>
                      Quick context before follow-up.
                    </p>
                  </div>

                  <div className="rounded-xl border border-border-subtle bg-surface-muted p-3.5">
                    <p className="m-0 text-sm leading-6 text-text-secondary [overflow-wrap:anywhere]">
                      {lead.notesSummary ??
                        'No notes are available for this lead yet.'}
                    </p>
                  </div>

                  {lead.tags?.length ? (
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {lead.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex min-h-7 max-w-full items-center rounded-pill border border-border-accent bg-primary-soft px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-accent [overflow-wrap:anywhere]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </PageCard>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

export default LeadDetailPanel;
