import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '../../../components/shared/data';
import AppIcon from '../../../components/shared/icons/AppIcon';
import { EmptyState, LoadingState, PageCard } from '../../../components/shared/page';
import { getChannelLabel, getLeadStatusLabel } from '../../../i18n/labels';
import { services } from '../../../services';
import type { EntityId, Lead } from '../../../types/domain';

interface LeadDetailPanelProps {
  leadId: EntityId;
  onClose: () => void;
}

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

const valueClassName =
  'text-sm font-semibold text-text-primary [overflow-wrap:anywhere]';

function formatDateTime(
  timestamp: string | undefined,
  locale: string,
  fallback: string,
): string {
  if (!timestamp) {
    return fallback;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

function LeadDetailPanel({ leadId, onClose }: LeadDetailPanelProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';
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
      className="fixed inset-0 z-40 flex justify-end bg-background-overlay/72 backdrop-blur-[3px]"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="h-full w-full overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:max-w-[460px] min-[641px]:p-5"
        onClick={(event) => event.stopPropagation()}
        aria-label={t('leads.detail.ariaLabel')}
      >
        <header className="mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40 transition duration-base hover:shadow-md hover:ring-border-soft/60">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t('leads.detail.profile')}
              </p>
              <h2 className="mt-1 font-display text-[1.55rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-text-primary [overflow-wrap:anywhere]">
                {lead?.fullName ?? t('leads.detail.titleFallback')}
              </h2>
              {!isLoading && lead ? (
                <p className="mt-1 text-sm text-text-secondary [overflow-wrap:anywhere]">
                  @
                  {lead.username ??
                    lead.contact.username ??
                    t('leads.unknownHandle')}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary shadow-sm transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              onClick={onClose}
              aria-label={t('leads.detail.close')}
            >
              <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>

          {!isLoading && lead ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge
                status={lead.status}
                label={getLeadStatusLabel(t, lead.status)}
              />
              <span className="inline-flex min-h-7 items-center gap-1.5 rounded-pill bg-info-bg px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-info">
                <AppIcon name="chat" className="h-3.5 w-3.5" aria-hidden="true" />
                {getChannelLabel(t, lead.source)}
              </span>
            </div>
          ) : null}
        </header>

        <div className="grid gap-3">
          {isLoading ? (
            <LoadingState
              title={t('leads.detail.loadingTitle')}
              description={t('leads.detail.loadingDescription')}
            />
          ) : null}

          {!isLoading && (hasError || !lead) ? (
            <EmptyState
              title={t('leads.detail.errorTitle')}
              description={t('leads.detail.errorDescription')}
            />
          ) : null}

          {!isLoading && lead ? (
            <>
              <PageCard>
                <div className="grid gap-4">
                  <div className="grid gap-1">
                    <h3 className="m-0 text-[1rem] font-semibold text-text-primary">
                      {t('leads.detail.contactTitle')}
                    </h3>
                    <p className="m-0 text-sm text-text-secondary">
                      {t('leads.detail.contactDescription')}
                    </p>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div className="rounded-lg bg-surface-subtle/80 p-3">
                      <p className={labelClassName}>{t('leads.detail.phone')}</p>
                      <p className={`mt-1 ${valueClassName}`}>
                        {lead.contact.phone ?? t('common.na')}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/80 p-3">
                      <p className={labelClassName}>{t('leads.detail.email')}</p>
                      <p className={`mt-1 ${valueClassName}`}>
                        {lead.contact.email ?? t('common.na')}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/80 p-3">
                      <p className={labelClassName}>{t('leads.detail.source')}</p>
                      <p className={`mt-1 ${valueClassName}`}>
                        {getChannelLabel(t, lead.source)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/80 p-3">
                      <p className={labelClassName}>{t('leads.detail.owner')}</p>
                      <p className={`mt-1 ${valueClassName}`}>
                        {lead.assignedOperator?.fullName ?? t('common.unassigned')}
                      </p>
                    </div>
                  </div>
                </div>
              </PageCard>

              <PageCard>
                <div className="grid gap-4">
                  <div className="grid gap-1">
                    <h3 className="m-0 text-[1rem] font-semibold text-text-primary">
                      {t('leads.detail.activityTitle')}
                    </h3>
                    <p className="m-0 text-sm text-text-secondary">
                      {t('leads.detail.activityDescription')}
                    </p>
                  </div>

                  <dl className="m-0 grid gap-2">
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5">
                      <dt className={labelClassName}>{t('leads.detail.created')}</dt>
                      <dd className={`m-0 ${valueClassName}`}>
                        {formatDateTime(lead.createdAt, locale, t('common.na'))}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5">
                      <dt className={labelClassName}>{t('leads.detail.updated')}</dt>
                      <dd className={`m-0 ${valueClassName}`}>
                        {formatDateTime(lead.updatedAt, locale, t('common.na'))}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5">
                      <dt className={labelClassName}>{t('leads.detail.lastContact')}</dt>
                      <dd className={`m-0 ${valueClassName}`}>
                        {formatDateTime(lead.lastContactAt, locale, t('common.na'))}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5">
                      <dt className={labelClassName}>{t('leads.detail.lastMessage')}</dt>
                      <dd className={`m-0 ${valueClassName}`}>
                        {formatDateTime(lead.lastMessageAt, locale, t('common.na'))}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5">
                      <dt className={labelClassName}>{t('leads.detail.leadReplied')}</dt>
                      <dd className={`m-0 ${valueClassName}`}>
                        {lead.replied ? t('common.yes') : t('common.no')}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5">
                      <dt className={labelClassName}>{t('leads.detail.dmSent')}</dt>
                      <dd className={`m-0 ${valueClassName}`}>
                        {lead.dmSent ? t('common.yes') : t('common.no')}
                      </dd>
                    </div>
                  </dl>
                </div>
              </PageCard>

              <PageCard>
                <div className="grid gap-4">
                  <div className="grid gap-1">
                    <h3 className="m-0 text-[1rem] font-semibold text-text-primary">
                      {t('leads.detail.notesTitle')}
                    </h3>
                    <p className="m-0 text-sm text-text-secondary">
                      {t('leads.detail.notesDescription')}
                    </p>
                  </div>

                  <div className="rounded-lg bg-surface-subtle/80 p-3.5">
                    <p className="m-0 text-sm leading-6 text-text-secondary [overflow-wrap:anywhere]">
                      {lead.notesSummary ?? t('leads.detail.noNotes')}
                    </p>
                  </div>

                  {lead.tags?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {lead.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex min-h-7 max-w-full items-center rounded-pill bg-primary/12 px-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-text-accent [overflow-wrap:anywhere]"
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
