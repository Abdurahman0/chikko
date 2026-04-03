import { useEffect, useState } from 'react';
import { FiEdit2, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '../../../components/shared/data';
import AppIcon from '../../../components/shared/icons/AppIcon';
import { EmptyState, LoadingState, PageCard } from '../../../components/shared/page';
import { formatLocalizedDate } from '../../../i18n/date-format';
import { services } from '../../../services';
import type { Courier, EntityId } from '../../../types/domain';

interface CourierDetailPanelProps {
  courierId: EntityId;
  refreshToken?: number;
  onClose: () => void;
  onEdit: (courier: Courier) => void;
  onDelete: (courier: Courier) => void;
  onToggleActive: (courier: Courier) => Promise<Courier | null>;
}

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

function getCourierName(courier: Courier): string {
  return (
    courier.firstName.trim() ||
    courier.username ||
    courier.telegramUserId ||
    courier.id
  );
}

function formatDate(value: string | undefined, language: string, locale: string): string {
  return formatLocalizedDate(value, language, {
    locale,
    withYear: true,
    withTime: true,
    shortMonth: true,
    fallback: 'N/A',
  });
}

function CourierDetailPanel({
  courierId,
  refreshToken = 0,
  onClose,
  onEdit,
  onDelete,
  onToggleActive,
}: CourierDetailPanelProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';

  const [courier, setCourier] = useState<Courier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadCourier() {
      setIsLoading(true);
      setHasError(false);

      try {
        const nextCourier = await services.couriers.getById(courierId);
        if (!isActive) {
          return;
        }

        setCourier(nextCourier);
      } catch {
        if (!isActive) {
          return;
        }

        setHasError(true);
        setCourier(null);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadCourier();

    return () => {
      isActive = false;
    };
  }, [courierId, refreshToken]);

  async function handleToggle() {
    if (!courier || isToggling) {
      return;
    }

    setIsToggling(true);
    try {
      const updated = await onToggleActive(courier);
      if (updated) {
        setCourier(updated);
      }
    } finally {
      setIsToggling(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-background-overlay/72 backdrop-blur-[3px]"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="h-full w-full overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:max-w-[560px] min-[641px]:p-5"
        onClick={(event) => event.stopPropagation()}
        aria-label={t('couriers.detail.ariaLabel')}
      >
        <header className="mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t('couriers.detail.title')}
              </p>
              <h2 className="mt-1 font-display text-[1.45rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-text-primary [overflow-wrap:anywhere]">
                {courier ? getCourierName(courier) : t('couriers.detail.title')}
              </h2>
              {courier?.phone ? (
                <p className="mt-1 text-sm text-text-secondary">{courier.phone}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary"
              onClick={onClose}
              aria-label={t('couriers.detail.close')}
            >
              <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>
          {courier ? (
            <div className="mt-3">
              <StatusBadge
                status={courier.isActive ? 'active' : 'inactive'}
                tone={courier.isActive ? 'success' : 'neutral'}
                label={courier.isActive ? t('common.active') : t('common.inactive')}
              />
            </div>
          ) : null}
        </header>

        <div className="grid gap-3">
          {isLoading ? (
            <LoadingState
              title={t('couriers.detail.loadingTitle')}
              description={t('couriers.detail.loadingDescription')}
            />
          ) : null}
          {!isLoading && (hasError || !courier) ? (
            <EmptyState
              title={t('couriers.detail.errorTitle')}
              description={t('couriers.detail.errorDescription')}
            />
          ) : null}

          {!isLoading && courier ? (
            <>
              <PageCard>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="rounded-lg bg-surface-subtle/80 p-3">
                    <p className={labelClassName}>{t('couriers.columns.telegramId')}</p>
                    <p className="m-0 mt-1 text-sm font-semibold text-text-primary">
                      {courier.telegramUserId || t('common.na')}
                    </p>
                  </div>
                  <div className="rounded-lg bg-surface-subtle/80 p-3">
                    <p className={labelClassName}>{t('couriers.form.username')}</p>
                    <p className="m-0 mt-1 text-sm font-semibold text-text-primary">
                      {courier.username ? `@${courier.username}` : t('common.na')}
                    </p>
                  </div>
                </div>
              </PageCard>

              <PageCard>
                <dl className="m-0 grid gap-2">
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5">
                    <dt className={labelClassName}>{t('couriers.detail.created')}</dt>
                    <dd className="m-0 text-sm font-semibold text-text-primary">
                      {formatDate(courier.createdAt, i18n.language, locale)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5">
                    <dt className={labelClassName}>{t('couriers.detail.updated')}</dt>
                    <dd className="m-0 text-sm font-semibold text-text-primary">
                      {formatDate(courier.updatedAt, i18n.language, locale)}
                    </dd>
                  </div>
                </dl>
              </PageCard>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
                  onClick={() => onEdit(courier)}
                >
                  <FiEdit2 className="h-4 w-4" /> {t('couriers.actions.edit')}
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-info px-4 text-sm font-semibold text-white disabled:opacity-60"
                  onClick={() => {
                    void handleToggle();
                  }}
                  disabled={isToggling}
                >
                  <FiRefreshCw className="h-4 w-4" />{' '}
                  {courier.isActive
                    ? t('couriers.actions.setInactive')
                    : t('couriers.actions.setActive')}
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-danger px-4 text-sm font-semibold text-white"
                  onClick={() => onDelete(courier)}
                >
                  <FiTrash2 className="h-4 w-4" /> {t('couriers.actions.delete')}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

export default CourierDetailPanel;
