import { useEffect, useState } from 'react';
import { FiEdit2, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '../../../components/shared/data';
import AppIcon from '../../../components/shared/icons/AppIcon';
import { EmptyState, LoadingState, PageCard } from '../../../components/shared/page';
import { formatCurrencyAmount } from '../../../constants';
import { formatLocalizedDate } from '../../../i18n/date-format';
import { getChannelLabel, getOrderStatusLabel } from '../../../i18n/labels';
import { services } from '../../../services';
import type { EntityId, Order } from '../../../types/domain';

interface OrderDetailPanelProps {
  orderId: EntityId;
  refreshToken?: number;
  isRecalculating?: boolean;
  onClose: () => void;
  onEdit: (order: Order) => void;
  onDelete: (order: Order) => void;
  onRecalculate: (orderId: EntityId) => Promise<Order | null>;
}

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

const valueClassName =
  'text-sm font-semibold text-text-primary [overflow-wrap:anywhere]';

function formatDateTime(
  timestamp: string | undefined,
  language: string,
  locale: string,
  fallback: string,
): string {
  return formatLocalizedDate(timestamp, language, {
    locale,
    withYear: true,
    withTime: true,
    shortMonth: true,
    fallback,
  });
}

function isLikelyUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

function resolveOrderTitle(order: Order | null | undefined, fallback: string): string {
  if (!order) {
    return fallback;
  }

  const firstItemProductName = order.items[0]?.product?.name?.trim() ?? '';
  if (firstItemProductName) {
    return firstItemProductName;
  }

  const orderNumber = order.orderNumber?.trim() ?? '';
  if (orderNumber && !/^#?[0-9a-f]{6,}$/i.test(orderNumber) && !isLikelyUuid(orderNumber)) {
    return orderNumber;
  }

  return (
    order.contactName?.trim() ||
    order.customer?.fullName?.trim() ||
    order.lead?.fullName?.trim() ||
    fallback
  );
}

function OrderDetailPanel({
  orderId,
  refreshToken = 0,
  isRecalculating = false,
  onClose,
  onEdit,
  onDelete,
  onRecalculate,
}: OrderDetailPanelProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';
  const [order, setOrder] = useState<Order | null>(null);
  const [resolvedLeadName, setResolvedLeadName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadOrder() {
      setIsLoading(true);
      setHasError(false);
      setActionError(null);

      try {
        const nextOrder = await services.orders.getById(orderId);

        if (!isActive) {
          return;
        }

        setOrder(nextOrder);
      } catch {
        if (!isActive) {
          return;
        }

        setHasError(true);
        setOrder(null);
        setResolvedLeadName(null);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadOrder();

    return () => {
      isActive = false;
    };
  }, [orderId, refreshToken]);

  useEffect(() => {
    let isActive = true;

    async function resolveLeadName() {
      const lead = order?.lead;
      if (!lead?.id) {
        setResolvedLeadName(null);
        return;
      }

      const leadFullName = lead.fullName?.trim() ?? '';
      if (leadFullName && !isLikelyUuid(leadFullName)) {
        setResolvedLeadName(leadFullName);
        return;
      }

      try {
        const leadDetails = await services.leads.getById(lead.id);
        if (!isActive) {
          return;
        }

        const nextLeadName = leadDetails?.fullName?.trim() ?? '';
        setResolvedLeadName(nextLeadName || null);
      } catch {
        if (isActive) {
          setResolvedLeadName(null);
        }
      }
    }

    void resolveLeadName();

    return () => {
      isActive = false;
    };
  }, [order?.lead?.fullName, order?.lead?.id]);

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
        className="h-full w-full overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:max-w-[560px] min-[641px]:p-5"
        onClick={(event) => event.stopPropagation()}
        aria-label={t('orders.detail.ariaLabel')}
      >
        <header className="mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40 transition duration-base hover:shadow-md hover:ring-border-soft/60">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t('orders.detail.eyebrow')}
              </p>
              <h2 className="mt-1 font-display text-[1.45rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-text-primary [overflow-wrap:anywhere]">
                {resolveOrderTitle(order, t('orders.detail.titleFallback'))}
              </h2>
              {!isLoading && order ? (
                <p className="mt-1 text-sm text-text-secondary [overflow-wrap:anywhere]">
                  {formatCurrencyAmount(order.totalAmount, locale)}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary shadow-sm transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              onClick={onClose}
              aria-label={t('orders.detail.close')}
            >
              <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>

          {!isLoading && order ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge
                status={order.status}
                label={getOrderStatusLabel(t, order.status)}
              />
              <span className="inline-flex min-h-7 items-center gap-1.5 rounded-pill bg-info-bg px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-info">
                <AppIcon name="chat" className="h-3.5 w-3.5" aria-hidden="true" />
                {getChannelLabel(t, order.source)}
              </span>
              <span className="inline-flex min-h-7 items-center rounded-pill bg-surface-subtle px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
                {order.aiGenerated ? t('orders.detail.aiYes') : t('orders.detail.aiNo')}
              </span>
            </div>
          ) : null}
        </header>

        <div className="grid gap-3">
          {isLoading ? (
            <LoadingState
              title={t('orders.detail.loadingTitle')}
              description={t('orders.detail.loadingDescription')}
            />
          ) : null}

          {!isLoading && (hasError || !order) ? (
            <EmptyState
              title={t('orders.detail.errorTitle')}
              description={t('orders.detail.errorDescription')}
            />
          ) : null}

          {!isLoading && order ? (
            <>
              <PageCard>
                <div className="grid gap-4">
                  <div className="grid gap-1">
                    <h3 className="m-0 text-[1rem] font-semibold text-text-primary">
                      {t('orders.detail.sectionContact')}
                    </h3>
                    <p className="m-0 text-sm text-text-secondary">
                      {t('orders.detail.sectionContactDescription')}
                    </p>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div className="rounded-lg bg-surface-subtle/80 p-3">
                      <p className={labelClassName}>{t('orders.columns.customerContact')}</p>
                      <p className={`mt-1 ${valueClassName}`}>
                        {order.customer?.fullName ?? order.contactName}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/80 p-3">
                      <p className={labelClassName}>{t('orders.detail.contactPhone')}</p>
                      <p className={`mt-1 ${valueClassName}`}>
                        {order.contactPhone || t('common.na')}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/80 p-3 sm:col-span-2">
                      <p className={labelClassName}>{t('orders.detail.shippingAddress')}</p>
                      <p className="mt-1 text-sm leading-6 text-text-secondary [overflow-wrap:anywhere]">
                        {order.shippingAddress || t('common.na')}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/80 p-3">
                      <p className={labelClassName}>{t('orders.detail.customer')}</p>
                      <p className={`mt-1 ${valueClassName}`}>
                        {order.customer?.fullName ?? t('orders.detail.noCustomer')}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/80 p-3">
                      <p className={labelClassName}>{t('orders.detail.lead')}</p>
                      <p className={`mt-1 ${valueClassName}`}>
                        {resolvedLeadName ?? t('orders.detail.noLead')}
                      </p>
                    </div>
                  </div>
                </div>
              </PageCard>

              <PageCard>
                <div className="grid gap-4">
                  <div className="grid gap-1">
                    <h3 className="m-0 text-[1rem] font-semibold text-text-primary">
                      {t('orders.detail.sectionItems')}
                    </h3>
                    <p className="m-0 text-sm text-text-secondary">
                      {t('orders.detail.sectionItemsDescription')}
                    </p>
                  </div>

                  <div className="overflow-x-auto rounded-lg bg-surface-subtle/80 p-2">
                    <table className="min-w-[360px] w-full border-separate border-spacing-y-1.5">
                      <thead>
                        <tr>
                          <th className="px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                            {t('orders.detail.itemProduct')}
                          </th>
                          <th className="px-2 py-1 text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                            {t('orders.detail.itemQty')}
                          </th>
                          <th className="px-2 py-1 text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                            {t('orders.detail.itemLineTotal')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item) => (
                          <tr key={item.id} className="rounded-lg bg-surface-card">
                            <td className="rounded-l-lg px-2 py-2 text-sm font-medium text-text-primary">
                              {item.product.name}
                            </td>
                            <td className="px-2 py-2 text-right text-sm text-text-secondary">
                              {item.quantity}
                            </td>
                            <td className="rounded-r-lg px-2 py-2 text-right text-sm font-semibold text-text-primary">
                              {formatCurrencyAmount(item.lineTotal, locale)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </PageCard>

              <PageCard>
                <div className="grid gap-4">
                  <div className="grid gap-1">
                    <h3 className="m-0 text-[1rem] font-semibold text-text-primary">
                      {t('orders.detail.sectionLifecycle')}
                    </h3>
                  </div>

                  <dl className="m-0 grid gap-2">
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5">
                      <dt className={labelClassName}>{t('orders.columns.totalAmount')}</dt>
                      <dd className={`m-0 ${valueClassName}`}>
                        {formatCurrencyAmount(order.totalAmount, locale)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5">
                    <dt className={labelClassName}>{t('orders.detail.createdAt')}</dt>
                    <dd className={`m-0 ${valueClassName}`}>
                      {formatDateTime(order.createdAt, language, locale, t('common.na'))}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5">
                    <dt className={labelClassName}>{t('orders.detail.updatedAt')}</dt>
                    <dd className={`m-0 ${valueClassName}`}>
                      {formatDateTime(order.updatedAt, language, locale, t('common.na'))}
                    </dd>
                  </div>
                  </dl>
                </div>
              </PageCard>

              <PageCard>
                <div className="grid gap-3">
                  <h3 className="m-0 text-[1rem] font-semibold text-text-primary">
                    {t('orders.detail.notes')}
                  </h3>
                  <div className="rounded-lg bg-surface-subtle/80 p-3.5">
                    <p className="m-0 text-sm leading-6 text-text-secondary [overflow-wrap:anywhere]">
                      {order.notes || t('orders.detail.noNotes')}
                    </p>
                  </div>
                </div>
              </PageCard>

              {actionError ? (
                <p className="m-0 rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
                  {actionError}
                </p>
              ) : null}

              <PageCard>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                    onClick={() => onEdit(order)}
                  >
                    <FiEdit2 className="h-4 w-4" />
                    {t('orders.actions.edit')}
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-info-bg px-4 text-sm font-semibold text-info transition duration-fast hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/35 disabled:opacity-60"
                    onClick={async () => {
                      setActionError(null);
                      try {
                        await onRecalculate(order.id);
                      } catch {
                        setActionError(t('orders.detail.recalculateError'));
                      }
                    }}
                    disabled={isRecalculating}
                  >
                    <FiRefreshCw className={`h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                    {isRecalculating
                      ? t('orders.actions.recalculating')
                      : t('orders.actions.recalculate')}
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-danger-bg px-4 text-sm font-semibold text-danger transition duration-fast hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30"
                    onClick={() => onDelete(order)}
                  >
                    <FiTrash2 className="h-4 w-4" />
                    {t('orders.actions.delete')}
                  </button>
                </div>
              </PageCard>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

export default OrderDetailPanel;
