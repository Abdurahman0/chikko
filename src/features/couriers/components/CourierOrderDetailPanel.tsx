import { useEffect, useMemo, useState } from 'react';
import { FiRepeat } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { FilterSelect, StatusBadge, Switch } from '../../../components/shared/data';
import AppIcon from '../../../components/shared/icons/AppIcon';
import { EmptyState, LoadingState, PageCard } from '../../../components/shared/page';
import { formatCurrencyAmount } from '../../../constants';
import { formatLocalizedDate } from '../../../i18n/date-format';
import { services } from '../../../services';
import type {
  CourierOrder,
  CourierOrderPatchInput,
  CourierOrderStatus,
  EntityId,
  SelectOption,
} from '../../../types/domain';

interface CourierOrderDetailPanelProps {
  orderId: EntityId;
  refreshToken?: number;
  onClose: () => void;
  onUpdated: (order: CourierOrder) => void;
}

interface OrderFormState {
  orderId: string;
  status: CourierOrderStatus;
  awaitingCancelReason: boolean;
  cancelReason: string;
}

const COURIER_ORDER_STATUSES: readonly CourierOrderStatus[] = [
  'pending',
  'assigned',
  'in_transit',
  'delivered',
];

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

function getStatusLabel(
  t: ReturnType<typeof useTranslation>['t'],
  status: CourierOrderStatus,
): string {
  return t(`couriers.orderStatus.${status}`, {
    defaultValue:
      status === 'in_transit'
        ? 'In Transit'
        : status.charAt(0).toUpperCase() + status.slice(1),
  });
}

function resolveCourierOrderTitle(
  order: CourierOrder | null,
  fallback: string,
): string {
  if (!order) {
    return fallback;
  }

  const firstProductName = order.orderInfo?.items?.[0]?.productName?.trim();
  if (firstProductName) {
    return firstProductName;
  }

  const contactName = order.orderInfo?.contactName?.trim();
  if (contactName) {
    return contactName;
  }

  return order.orderDetail || order.orderId || fallback;
}

function CourierOrderDetailPanel({
  orderId,
  refreshToken = 0,
  onClose,
  onUpdated,
}: CourierOrderDetailPanelProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';
  const fallbackValue = t('common.na');

  const [order, setOrder] = useState<CourierOrder | null>(null);
  const [form, setForm] = useState<OrderFormState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadOrder() {
      setIsLoading(true);
      setHasError(false);

      try {
        const nextOrder = await services.couriers.getOrderById(orderId);
        if (!isActive) {
          return;
        }

        if (!nextOrder) {
          setHasError(true);
          setOrder(null);
          setForm(null);
          return;
        }

        setOrder(nextOrder);
        setForm({
          orderId: nextOrder.orderId,
          status: nextOrder.status,
          awaitingCancelReason: nextOrder.awaitingCancelReason,
          cancelReason: nextOrder.cancelReason ?? '',
        });
      } catch {
        if (!isActive) {
          return;
        }

        setHasError(true);
        setOrder(null);
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

  const statusOptions = useMemo<SelectOption[]>(
    () =>
      COURIER_ORDER_STATUSES.map((status) => ({
        value: status,
        label: getStatusLabel(t, status),
      })),
    [t],
  );

  function buildPatchPayload(): { payload?: CourierOrderPatchInput; error?: string } {
    if (!form) {
      return { error: t('couriers.orderDetail.saveError') };
    }

    return {
      payload: {
        status: form.status,
        awaitingCancelReason: form.awaitingCancelReason,
        cancelReason: form.cancelReason.trim(),
        metadata: order?.metadata,
      },
    };
  }

  async function handlePatch() {
    const result = buildPatchPayload();
    if (!result.payload) {
      setActionError(result.error ?? t('couriers.orderDetail.saveError'));
      return;
    }

    setIsSaving(true);
    setActionError(null);
    try {
      const updated = await services.couriers.patchOrder(orderId, result.payload);
      if (updated) {
        setOrder(updated);
        onUpdated(updated);
      }
    } catch {
      setActionError(t('couriers.orderDetail.saveError'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRepost() {
    const result = buildPatchPayload();
    if (!result.payload) {
      setActionError(result.error ?? t('couriers.orderDetail.repostError'));
      return;
    }

    setIsReposting(true);
    setActionError(null);
    try {
      const updated = await services.couriers.repostOrder(orderId, result.payload);
      if (updated) {
        setOrder(updated);
        onUpdated(updated);
      }
    } catch {
      setActionError(t('couriers.orderDetail.repostError'));
    } finally {
      setIsReposting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-background-overlay/72 backdrop-blur-[3px]"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="h-full w-full overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:max-w-[620px] min-[641px]:p-5"
        onClick={(event) => event.stopPropagation()}
        aria-label={t('couriers.orderDetail.ariaLabel')}
      >
        <header className="mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t('couriers.orderDetail.title')}
              </p>
              <h2 className="mt-1 font-display text-[1.45rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-text-primary [overflow-wrap:anywhere]">
                {resolveCourierOrderTitle(order, t('couriers.orderDetail.title'))}
              </h2>
            </div>
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary"
              onClick={onClose}
              aria-label={t('couriers.orderDetail.close')}
            >
              <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>
          {order ? (
            <div className="mt-3">
              <StatusBadge
                status={order.status}
                label={getStatusLabel(t, order.status)}
              />
            </div>
          ) : null}
        </header>

        {isLoading ? (
          <LoadingState
            title={t('couriers.orderDetail.loadingTitle')}
            description={t('couriers.orderDetail.loadingDescription')}
          />
        ) : null}
        {!isLoading && (hasError || !order || !form) ? (
          <EmptyState
            title={t('couriers.orderDetail.errorTitle')}
            description={t('couriers.orderDetail.errorDescription')}
          />
        ) : null}

        {!isLoading && order && form ? (
          <div className="grid gap-3">
            {order.orderInfo ? (
              <PageCard>
                <div className="grid gap-4">
                  <div className="grid gap-1">
                    <h3 className="m-0 text-[1rem] font-semibold text-text-primary">
                      {t('couriers.orderDetail.orderSummaryTitle')}
                    </h3>
                    <p className="m-0 text-sm text-text-secondary">
                      {t('couriers.orderDetail.orderSummaryDescription')}
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg bg-surface-subtle/85 px-3 py-2.5">
                      <p className={labelClassName}>{t('couriers.orderDetail.contactName')}</p>
                      <p className="m-0 mt-1 text-sm font-semibold text-text-primary">
                        {order.orderInfo.contactName || fallbackValue}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/85 px-3 py-2.5">
                      <p className={labelClassName}>{t('couriers.orderDetail.contactPhone')}</p>
                      <p className="m-0 mt-1 text-sm font-semibold text-text-primary">
                        {order.orderInfo.contactPhone || fallbackValue}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/85 px-3 py-2.5 sm:col-span-2">
                      <p className={labelClassName}>{t('couriers.orderDetail.shippingAddress')}</p>
                      <p className="m-0 mt-1 text-sm font-semibold text-text-primary [overflow-wrap:anywhere]">
                        {order.orderInfo.shippingAddress || fallbackValue}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/85 px-3 py-2.5">
                      <p className={labelClassName}>{t('couriers.orderDetail.totalAmount')}</p>
                      <p className="m-0 mt-1 text-sm font-semibold text-text-primary">
                        {formatCurrencyAmount(order.orderInfo.totalAmount, locale)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <p className={labelClassName}>{t('couriers.orderDetail.items')}</p>
                    <div className="overflow-x-auto rounded-lg border border-border-soft/55 bg-surface-subtle/55">
                      <table className="min-w-[440px] w-full border-separate border-spacing-0">
                        <thead>
                          <tr>
                            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                              {t('couriers.orderDetail.itemColumns.product')}
                            </th>
                            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                              {t('couriers.orderDetail.itemColumns.quantity')}
                            </th>
                            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                              {t('couriers.orderDetail.itemColumns.unitPrice')}
                            </th>
                            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                              {t('couriers.orderDetail.itemColumns.lineTotal')}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.orderInfo.items.length > 0 ? (
                            order.orderInfo.items.map((item) => (
                              <tr key={item.id} className="border-t border-border-soft/55">
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-2.5">
                                    {item.productImageUrl ? (
                                      <img
                                        src={item.productImageUrl}
                                        alt={item.productName || t('couriers.orderDetail.itemColumns.product')}
                                        className="h-10 w-10 shrink-0 rounded-md object-cover ring-1 ring-border-soft/50"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-card text-[11px] font-semibold text-text-muted ring-1 ring-border-soft/50">
                                        #
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="m-0 truncate text-sm font-semibold text-text-primary">
                                        {item.productName || item.productId || fallbackValue}
                                      </p>
                                      {item.productId ? (
                                        <p className="m-0 truncate text-[11px] font-medium text-text-muted">
                                          {item.productId}
                                        </p>
                                      ) : null}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-right text-sm font-semibold text-text-secondary">
                                  {new Intl.NumberFormat(locale).format(item.quantity)}
                                </td>
                                <td className="px-3 py-2.5 text-right text-sm font-semibold text-text-secondary">
                                  {formatCurrencyAmount(item.unitPrice, locale)}
                                </td>
                                <td className="px-3 py-2.5 text-right text-sm font-semibold text-text-primary">
                                  {formatCurrencyAmount(item.lineTotal, locale)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-3 py-3 text-sm font-medium text-text-secondary"
                              >
                                {t('couriers.orderDetail.noItems')}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </PageCard>
            ) : null}

            <PageCard allowOverflow>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <label className={labelClassName} htmlFor="courier-order-order-id">
                    {t('couriers.orderDetail.orderId')}
                  </label>
                  <input
                    id="courier-order-order-id"
                    type="text"
                    className="w-full cursor-not-allowed rounded-lg border border-border-soft/60 bg-surface-subtle px-3.5 py-2.5 text-sm font-medium text-text-secondary"
                    value={form.orderId}
                    readOnly
                    disabled
                  />
                </div>
                <div className="grid gap-1.5">
                  <span className={labelClassName}>{t('couriers.orderDetail.status')}</span>
                  <FilterSelect
                    value={form.status}
                    options={statusOptions}
                    onChange={(value) =>
                      setForm((current) =>
                        current
                          ? { ...current, status: value as CourierOrderStatus }
                          : current,
                      )
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-subtle px-3 py-2.5">
                  <span className="text-sm font-semibold text-text-primary">
                    {t('couriers.orderDetail.awaitingCancelReason')}
                  </span>
                  <Switch
                    checked={form.awaitingCancelReason}
                    onChange={(next) =>
                      setForm((current) =>
                        current ? { ...current, awaitingCancelReason: next } : current,
                      )
                    }
                    ariaLabel={t('couriers.orderDetail.awaitingCancelReason')}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className={labelClassName} htmlFor="courier-order-cancel-reason">
                    {t('couriers.orderDetail.cancelReason')}
                  </label>
                  <input
                    id="courier-order-cancel-reason"
                    type="text"
                    className="w-full rounded-lg border border-border-soft/60 bg-surface-card px-3.5 py-2.5 text-sm font-medium text-text-primary"
                    value={form.cancelReason}
                    onChange={(event) =>
                      setForm((current) =>
                        current ? { ...current, cancelReason: event.target.value } : current,
                      )
                    }
                  />
                </div>
              </div>
            </PageCard>

            <PageCard>
              <p className="m-0 text-sm text-text-secondary">
                {t('couriers.orderDetail.updated')}:{' '}
                {formatLocalizedDate(order.updatedAt, i18n.language, {
                  locale,
                  withYear: true,
                  withTime: true,
                  shortMonth: true,
                  fallback: t('common.na'),
                })}
              </p>
            </PageCard>

            {actionError ? (
              <p className="m-0 rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
                {actionError}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                onClick={() => {
                  void handlePatch();
                }}
                disabled={isSaving || isReposting}
              >
                {isSaving ? t('couriers.form.saving') : t('couriers.actions.savePatch')}
              </button>
              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-info px-4 text-sm font-semibold text-white disabled:opacity-60"
                onClick={() => {
                  void handleRepost();
                }}
                disabled={isSaving || isReposting}
              >
                <FiRepeat className="h-4 w-4" />{' '}
                {isReposting
                  ? t('couriers.orderDetail.reposting')
                  : t('couriers.actions.repostOffer')}
              </button>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

export default CourierOrderDetailPanel;
