import { useEffect, useState } from 'react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import AppIcon from '../../../components/shared/icons/AppIcon';
import { EmptyState, LoadingState, PageCard } from '../../../components/shared/page';
import { services } from '../../../services';
import type { Customer, EntityId } from '../../../types/domain';

interface CustomerDetailPanelProps {
  customerId: EntityId;
  refreshToken?: number;
  canManageCustomers: boolean;
  resolveOperatorName?: (operatorId: EntityId, fallbackName?: string) => string | undefined;
  onClose: () => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

const valueClassName =
  'text-sm font-semibold text-text-primary [overflow-wrap:anywhere]';

function isUuidLike(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

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

function formatAddress(customer: Customer, fallback: string): string {
  if (!customer.address) {
    return fallback;
  }

  return [
    customer.address.line1,
    customer.address.city,
    customer.address.region,
  ]
    .filter(Boolean)
    .join(', ');
}

function CustomerDetailPanel({
  customerId,
  refreshToken = 0,
  canManageCustomers,
  resolveOperatorName,
  onClose,
  onEdit,
  onDelete,
}: CustomerDetailPanelProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadCustomer() {
      setIsLoading(true);
      setHasError(false);

      try {
        const nextCustomer = await services.customers.getCustomerById(customerId);
        if (!isActive) {
          return;
        }

        setCustomer(nextCustomer);
      } catch {
        if (!isActive) {
          return;
        }

        setHasError(true);
        setCustomer(null);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadCustomer();

    return () => {
      isActive = false;
    };
  }, [customerId, refreshToken]);

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

  const resolvedOperatorName =
    customer?.assignedOperator?.id
      ? resolveOperatorName?.(
          customer.assignedOperator.id,
          customer.assignedOperator.fullName,
        ) ?? customer.assignedOperator.fullName
      : customer?.assignedOperator?.fullName;

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-background-overlay/72 backdrop-blur-[3px]"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="h-full w-full overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:max-w-[520px] min-[641px]:p-5"
        onClick={(event) => event.stopPropagation()}
        aria-label={t('customers.detail.ariaLabel')}
      >
        <header className="mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40 transition duration-base hover:shadow-md hover:ring-border-soft/60">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t('customers.detail.profile')}
              </p>
              <h2 className="mt-1 font-display text-[1.5rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-text-primary [overflow-wrap:anywhere]">
                {customer?.fullName ?? t('customers.detail.titleFallback')}
              </h2>
              {!isLoading && customer ? (
                <p className="mt-1 text-sm text-text-secondary [overflow-wrap:anywhere]">
                  {customer.contact.phone ?? t('customers.noPhone')}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary shadow-sm transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              onClick={onClose}
              aria-label={t('customers.detail.close')}
            >
              <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="grid gap-3">
          {isLoading ? (
            <LoadingState
              title={t('customers.detail.loadingTitle')}
              description={t('customers.detail.loadingDescription')}
            />
          ) : null}

          {!isLoading && (hasError || !customer) ? (
            <EmptyState
              title={t('customers.detail.errorTitle')}
              description={t('customers.detail.errorDescription')}
            />
          ) : null}

          {!isLoading && customer ? (
            <>
              <PageCard>
                <div className="grid gap-4">
                  <div className="grid gap-1">
                    <h3 className="m-0 text-[1rem] font-semibold text-text-primary">
                      {t('customers.detail.contactTitle')}
                    </h3>
                    <p className="m-0 text-sm text-text-secondary">
                      {t('customers.detail.contactDescription')}
                    </p>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div className="rounded-lg bg-surface-subtle/80 p-3">
                      <p className={labelClassName}>{t('customers.detail.phone')}</p>
                      <p className={`mt-1 ${valueClassName}`}>
                        {customer.contact.phone ?? t('common.na')}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/80 p-3">
                      <p className={labelClassName}>{t('customers.detail.email')}</p>
                      <p className={`mt-1 ${valueClassName}`}>
                        {customer.contact.email ?? t('common.na')}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/80 p-3 sm:col-span-2">
                      <p className={labelClassName}>{t('customers.detail.address')}</p>
                      <p className={`mt-1 ${valueClassName}`}>
                        {formatAddress(customer, t('common.na'))}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/80 p-3">
                      <p className={labelClassName}>{t('customers.detail.operator')}</p>
                      <p
                        className={[
                          'mt-1',
                          isUuidLike(resolvedOperatorName)
                            ? 'text-sm font-medium text-text-secondary [overflow-wrap:anywhere]'
                            : valueClassName,
                        ].join(' ')}
                      >
                        {resolvedOperatorName ?? t('common.unassigned')}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/80 p-3">
                      <p className={labelClassName}>{t('customers.detail.linkedLead')}</p>
                      <p
                        className={[
                          'mt-1',
                          isUuidLike(customer.lead?.fullName)
                            ? 'text-sm font-medium text-text-secondary [overflow-wrap:anywhere]'
                            : valueClassName,
                        ].join(' ')}
                      >
                        {customer.lead?.fullName ?? t('customers.noLeadLink')}
                      </p>
                    </div>
                  </div>
                </div>
              </PageCard>

              <PageCard>
                <div className="grid gap-4">
                  <h3 className="m-0 text-[1rem] font-semibold text-text-primary">
                    {t('customers.detail.notes')}
                  </h3>
                  <div className="rounded-lg bg-surface-subtle/80 p-3.5">
                    <p className="m-0 text-sm leading-6 text-text-secondary [overflow-wrap:anywhere]">
                      {customer.notes ?? t('customers.noNotes')}
                    </p>
                  </div>
                </div>
              </PageCard>

              <PageCard>
                <div className="grid gap-3">
                  <dl className="m-0 grid gap-2">
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5">
                      <dt className={labelClassName}>{t('customers.detail.created')}</dt>
                      <dd className={`m-0 ${valueClassName}`}>
                        {formatDateTime(customer.createdAt, locale, t('common.na'))}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5">
                      <dt className={labelClassName}>{t('customers.detail.updated')}</dt>
                      <dd className={`m-0 ${valueClassName}`}>
                        {formatDateTime(customer.updatedAt, locale, t('common.na'))}
                      </dd>
                    </div>
                  </dl>
                </div>
              </PageCard>

              <PageCard>
                {canManageCustomers ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                      onClick={() => onEdit(customer)}
                    >
                      <FiEdit2 className="h-4 w-4" />
                      {t('customers.actions.edit')}
                    </button>
                    <button
                      type="button"
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-danger-bg px-4 text-sm font-semibold text-danger transition duration-fast hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30"
                      onClick={() => onDelete(customer)}
                    >
                      <FiTrash2 className="h-4 w-4" />
                      {t('customers.actions.delete')}
                    </button>
                  </div>
                ) : (
                  <p className="m-0 rounded-lg bg-surface-subtle/90 px-3 py-2.5 text-sm text-text-secondary">
                    {t('customers.detail.readOnlyHint')}
                  </p>
                )}
              </PageCard>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

export default CustomerDetailPanel;
