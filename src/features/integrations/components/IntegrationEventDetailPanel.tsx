import { useEffect, useState } from 'react';
import { FaInstagram, FaTelegramPlane } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '../../../components/shared/data';
import AppIcon from '../../../components/shared/icons/AppIcon';
import { EmptyState, LoadingState, PageCard } from '../../../components/shared/page';
import { services } from '../../../services';
import type { EntityId, IntegrationEvent } from '../../../types/domain';
import {
  formatIntegrationDateTime,
  getIntegrationPlatformClassName,
  getIntegrationPlatformLabel,
} from '../utils/integration-format';

interface IntegrationEventDetailPanelProps {
  eventId: EntityId;
  onClose: () => void;
}

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

const valueClassName =
  'text-sm font-semibold text-text-primary [overflow-wrap:anywhere]';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveHumanLabel(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || UUID_PATTERN.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function PlatformIcon({ platform }: { platform: IntegrationEvent['platform'] }) {
  if (platform === 'telegram') {
    return <FaTelegramPlane className="h-3.5 w-3.5" aria-hidden="true" />;
  }

  if (platform === 'instagram') {
    return <FaInstagram className="h-3.5 w-3.5" aria-hidden="true" />;
  }

  if (platform === 'userbot') {
    return <AppIcon name="activity" className="h-3.5 w-3.5" aria-hidden="true" />;
  }

  return <AppIcon name="payments" className="h-3.5 w-3.5" aria-hidden="true" />;
}

function IntegrationEventDetailPanel({
  eventId,
  onClose,
}: IntegrationEventDetailPanelProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';
  const [event, setEvent] = useState<IntegrationEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadEvent() {
      setIsLoading(true);
      setHasError(false);

      try {
        const nextEvent = await services.integrations.getIntegrationEventById(eventId);
        if (!isActive) {
          return;
        }

        setEvent(nextEvent);
      } catch {
        if (!isActive) {
          return;
        }

        setHasError(true);
        setEvent(null);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadEvent();

    return () => {
      isActive = false;
    };
  }, [eventId]);

  useEffect(() => {
    function handleEscape(eventKeyboard: KeyboardEvent) {
      if (eventKeyboard.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-background-overlay/72 backdrop-blur-[3px]"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="h-full w-full overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:max-w-[640px] min-[641px]:p-5"
        onClick={(eventMouse) => eventMouse.stopPropagation()}
        aria-label={t('integrations.eventDetail.ariaLabel')}
      >
        <header className="mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40 transition duration-base hover:shadow-md hover:ring-border-soft/60">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t('integrations.eventDetail.eyebrow')}
              </p>
              <h2 className="mt-1 font-display text-[1.35rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-text-primary [overflow-wrap:anywhere]">
                {event?.event_type ?? t('integrations.eventDetail.titleFallback')}
              </h2>
              {!isLoading && event ? (
                <p className="mt-1 text-sm text-text-secondary [overflow-wrap:anywhere]">
                  {resolveHumanLabel(event.external_id) ?? t('common.na')}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary shadow-sm transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              onClick={onClose}
              aria-label={t('integrations.eventDetail.close')}
            >
              <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>

          {!isLoading && event ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={[
                  'inline-flex min-h-7 items-center gap-1.5 rounded-pill px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em]',
                  getIntegrationPlatformClassName(event.platform),
                ].join(' ')}
              >
                <PlatformIcon platform={event.platform} />
                {getIntegrationPlatformLabel(event.platform)}
              </span>
              <StatusBadge
                status={event.processed ? 'processed' : 'pending'}
                tone={event.processed ? 'success' : 'warning'}
                label={event.processed ? t('integrations.processed') : t('integrations.pending')}
              />
            </div>
          ) : null}
        </header>

        <div className="grid gap-3">
          {isLoading ? (
            <LoadingState
              title={t('integrations.eventDetail.loadingTitle')}
              description={t('integrations.eventDetail.loadingDescription')}
            />
          ) : null}

          {!isLoading && (hasError || !event) ? (
            <EmptyState
              title={t('integrations.eventDetail.errorTitle')}
              description={t('integrations.eventDetail.errorDescription')}
            />
          ) : null}

          {!isLoading && event ? (
            <>
              <PageCard>
                <div className="grid gap-3">
                  <h3 className="m-0 text-[1rem] font-semibold text-text-primary">
                    {t('integrations.eventDetail.eventInfo')}
                  </h3>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div className="rounded-lg bg-surface-subtle/80 p-3">
                      <p className={labelClassName}>{t('integrations.eventFields.platform')}</p>
                      <p className={`mt-1 ${valueClassName}`}>
                        {getIntegrationPlatformLabel(event.platform)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/80 p-3">
                      <p className={labelClassName}>{t('integrations.eventFields.eventType')}</p>
                      <p className={`mt-1 ${valueClassName}`}>{event.event_type}</p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/80 p-3">
                      <p className={labelClassName}>{t('integrations.eventFields.externalId')}</p>
                      <p className={`mt-1 ${valueClassName}`}>
                        {resolveHumanLabel(event.external_id) ?? t('common.na')}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/80 p-3">
                      <p className={labelClassName}>{t('integrations.eventFields.eventKey')}</p>
                      <p className={`mt-1 ${valueClassName}`}>
                        {resolveHumanLabel(event.event_key) ?? t('common.na')}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/80 p-3">
                      <p className={labelClassName}>{t('integrations.eventFields.attempts')}</p>
                      <p className={`mt-1 ${valueClassName}`}>{event.processing_attempts}</p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/80 p-3">
                      <p className={labelClassName}>{t('integrations.eventFields.processed')}</p>
                      <p className={`mt-1 ${valueClassName}`}>
                        {event.processed ? t('integrations.processed') : t('integrations.pending')}
                      </p>
                    </div>
                  </div>
                </div>
              </PageCard>

              {event.error_message ? (
                <PageCard>
                  <div className="rounded-lg bg-danger-bg px-3 py-2.5 text-sm font-medium text-danger">
                    <span className="font-semibold">
                      {t('integrations.eventFields.errorMessage')}:
                    </span>{' '}
                    {event.error_message}
                  </div>
                </PageCard>
              ) : null}

              <PageCard>
                <div className="grid gap-3">
                  <h3 className="m-0 text-[1rem] font-semibold text-text-primary">
                    {t('integrations.eventFields.payload')}
                  </h3>
                  <pre className="m-0 max-h-[280px] overflow-auto rounded-lg bg-surface-subtle/80 p-3 text-[12px] leading-6 text-text-secondary">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                </div>
              </PageCard>

              <PageCard>
                <dl className="m-0 grid gap-2">
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5">
                    <dt className={labelClassName}>{t('integrations.eventFields.createdAt')}</dt>
                    <dd className={`m-0 ${valueClassName}`}>
                      {formatIntegrationDateTime(
                        event.created_at,
                        i18n.language,
                        locale,
                        t('common.na'),
                      )}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5">
                    <dt className={labelClassName}>{t('integrations.eventFields.updatedAt')}</dt>
                    <dd className={`m-0 ${valueClassName}`}>
                      {formatIntegrationDateTime(
                        event.updated_at,
                        i18n.language,
                        locale,
                        t('common.na'),
                      )}
                    </dd>
                  </div>
                </dl>
              </PageCard>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

export default IntegrationEventDetailPanel;
