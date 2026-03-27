import { useEffect, useState } from 'react';
import { FiCheckCircle, FiShield, FiTrash2, FiXCircle } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '../../../components/shared/data';
import AppIcon from '../../../components/shared/icons/AppIcon';
import { EmptyState, LoadingState, PageCard } from '../../../components/shared/page';
import { formatCurrencyAmount } from '../../../constants';
import { formatLocalizedDate } from '../../../i18n/date-format';
import { getPaymentMethodLabel, getPaymentStatusLabel } from '../../../i18n/labels';
import { services } from '../../../services';
import type { EntityId, Order, Payment } from '../../../types/domain';

interface PaymentDetailPanelProps {
  paymentId: EntityId;
  refreshToken?: number;
  canManagePayments: boolean;
  onClose: () => void;
  onDelete: (payment: Payment) => void;
  onApprove: (id: EntityId) => Promise<Payment | null>;
  onReject: (id: EntityId) => Promise<Payment | null>;
  onVerify: (id: EntityId) => Promise<Payment | null>;
}

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

const valueClassName =
  'text-sm font-semibold text-text-primary [overflow-wrap:anywhere]';

const overviewCardClassName =
  'h-[84px] rounded-lg bg-surface-subtle/80 p-3';

const overviewValueClassName =
  'mt-1 truncate text-sm font-semibold text-text-primary';

const actionButtonClassName =
  'inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition duration-fast focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60';

type PaymentStatusBadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

function formatDateTime(
  timestamp: string | null | undefined,
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

function formatAmount(value: number, locale: string): string {
  return formatCurrencyAmount(value, locale);
}

function getPaymentStatusTone(status: Payment['status']): PaymentStatusBadgeTone {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'approved':
      return 'success';
    case 'rejected':
      return 'danger';
    case 'verified':
      return 'info';
    case 'failed':
    default:
      return 'neutral';
  }
}

function isLikelyUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

function resolveOrderLabel(order: Order | null): string | null {
  if (!order) {
    return null;
  }

  const label =
    order.orderNumber ||
    order.customer?.fullName ||
    order.contactName ||
    null;

  return label && label.trim().length > 0 ? label : null;
}

function getPaymentDisplayLabel(payment: Payment): string {
  const candidate =
    payment.submitted_by_name.trim() ||
    (payment.verification_reference ?? '').trim() ||
    '';

  return candidate || 'Payment';
}

function PaymentDetailPanel({
  paymentId,
  refreshToken = 0,
  canManagePayments,
  onClose,
  onDelete,
  onApprove,
  onReject,
  onVerify,
}: PaymentDetailPanelProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';

  const [payment, setPayment] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [orderLabel, setOrderLabel] = useState<string | null>(null);
  const [reviewedByLabel, setReviewedByLabel] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<
    'approve' | 'reject' | 'verify' | null
  >(null);

  useEffect(() => {
    let isActive = true;

    async function loadPayment() {
      setIsLoading(true);
      setHasError(false);
      setActionError(null);

      try {
        const nextPayment = await services.payments.getPaymentById(paymentId);
        if (!isActive) {
          return;
        }

        setPayment(nextPayment);
      } catch {
        if (!isActive) {
          return;
        }

        setHasError(true);
        setPayment(null);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadPayment();

    return () => {
      isActive = false;
    };
  }, [paymentId, refreshToken]);

  useEffect(() => {
    let isActive = true;

    async function loadRelatedLabels() {
      if (!payment) {
        setOrderLabel(null);
        setReviewedByLabel(null);
        return;
      }

      setOrderLabel(null);

      if (payment.order) {
        try {
          const relatedOrder = await services.orders.getById(payment.order);
          if (!isActive) {
            return;
          }
          setOrderLabel(resolveOrderLabel(relatedOrder));
        } catch {
          if (!isActive) {
            return;
          }
          setOrderLabel(null);
        }
      }

      const reviewedByRaw = payment.reviewed_by;
      if (!reviewedByRaw) {
        setReviewedByLabel(null);
        return;
      }

      if (!isLikelyUuid(reviewedByRaw)) {
        setReviewedByLabel(reviewedByRaw);
        return;
      }

      try {
        const reviewedByUser = await services.users.getUserById(reviewedByRaw);
        if (!isActive) {
          return;
        }

        setReviewedByLabel(reviewedByUser?.full_name ?? null);
      } catch {
        if (!isActive) {
          return;
        }
        setReviewedByLabel(null);
      }
    }

    void loadRelatedLabels();

    return () => {
      isActive = false;
    };
  }, [payment]);

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

  async function handleAction(
    type: 'approve' | 'reject' | 'verify',
    handler: (id: EntityId) => Promise<Payment | null>,
  ) {
    if (!payment) {
      return;
    }

    if (type === 'verify' && payment.status !== 'approved') {
      return;
    }

    if ((type === 'approve' || type === 'reject') && payment.status !== 'pending') {
      return;
    }

    setActionError(null);
    setActionLoading(type);

    try {
      const updated = await handler(payment.id);
      if (!updated) {
        throw new Error(t('payments.actions.notFoundError'));
      }

      setPayment(updated);
    } catch {
      setActionError(t('payments.actions.updateError'));
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-background-overlay/72 backdrop-blur-[3px]"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="h-full w-full overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:max-w-[580px] min-[641px]:p-5"
        onClick={(event) => event.stopPropagation()}
        aria-label={t('payments.detail.ariaLabel')}
      >
        <header className="mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40 transition duration-base hover:shadow-md hover:ring-border-soft/60">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t('payments.title')}
              </p>
              <h2 className="mt-1 font-display text-[1.45rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-text-primary [overflow-wrap:anywhere]">
                {payment ? getPaymentDisplayLabel(payment) : t('payments.detail.titleFallback')}
              </h2>
              {!isLoading && payment ? (
                <p className="mt-1 text-sm text-text-secondary [overflow-wrap:anywhere]">
                  {formatAmount(payment.amount, locale)}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary shadow-sm transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              onClick={onClose}
              aria-label={t('payments.detail.close')}
            >
              <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>

          {!isLoading && payment ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge
                status={payment.status}
                tone={getPaymentStatusTone(payment.status)}
                label={getPaymentStatusLabel(t, payment.status)}
              />
              <span className="inline-flex min-h-7 items-center rounded-pill bg-info-bg px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-info">
                {getPaymentMethodLabel(t, payment.method)}
              </span>
              <span className="inline-flex min-h-7 items-center rounded-pill bg-surface-subtle px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
                {t('payments.detail.orderBadge', {
                  order: orderLabel ?? t('payments.notAvailable'),
                })}
              </span>
            </div>
          ) : null}
        </header>

        <div className="grid gap-3">
          {isLoading ? (
            <LoadingState
              title={t('payments.detail.loadingTitle')}
              description={t('payments.detail.loadingDescription')}
            />
          ) : null}

          {!isLoading && (hasError || !payment) ? (
            <EmptyState
              title={t('payments.detail.errorTitle')}
              description={t('payments.detail.errorDescription')}
            />
          ) : null}

          {!isLoading && payment ? (
            <>
              <PageCard>
                <div className="grid gap-4">
                  <div className="grid gap-1">
                    <h3 className="m-0 text-[1rem] font-semibold text-text-primary">
                      {t('payments.detail.sectionOverview')}
                    </h3>
                    <p className="m-0 text-sm text-text-secondary">
                      {t('payments.detail.sectionOverviewDescription')}
                    </p>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div className={overviewCardClassName}>
                      <p className={labelClassName}>{t('payments.detail.submittedBy')}</p>
                      <p
                        className={overviewValueClassName}
                        title={payment.submitted_by_name}
                      >
                        {payment.submitted_by_name}
                      </p>
                    </div>
                    <div className={overviewCardClassName}>
                      <p className={labelClassName}>{t('payments.detail.lastFourDigits')}</p>
                      <p
                        className={overviewValueClassName}
                        title={payment.last_four_digits ?? t('payments.notAvailable')}
                      >
                        {payment.last_four_digits ?? t('payments.notAvailable')}
                      </p>
                    </div>
                    <div className={overviewCardClassName}>
                      <p className={labelClassName}>
                        {t('payments.detail.verificationReference')}
                      </p>
                      <p
                        className={overviewValueClassName}
                        title={payment.verification_reference ?? t('payments.notAvailable')}
                      >
                        {payment.verification_reference ?? t('payments.notAvailable')}
                      </p>
                    </div>
                    <div className={overviewCardClassName}>
                      <p className={labelClassName}>{t('payments.detail.reviewedBy')}</p>
                      <p
                        className={overviewValueClassName}
                        title={reviewedByLabel ?? t('payments.notAvailable')}
                      >
                        {reviewedByLabel ?? t('payments.notAvailable')}
                      </p>
                    </div>
                  </div>
                </div>
              </PageCard>

              <PageCard>
                <div className="grid gap-4">
                  <h3 className="m-0 text-[1rem] font-semibold text-text-primary">
                    {t('payments.detail.sectionScreenshot')}
                  </h3>
                  {payment.screenshot ? (
                    <a
                      href={payment.screenshot}
                      target="_blank"
                      rel="noreferrer"
                      className="group block overflow-hidden rounded-xl bg-surface-subtle/80 p-2 ring-1 ring-border-soft/45"
                    >
                      <img
                        src={payment.screenshot}
                        alt={t('payments.detail.screenshotAlt', {
                          id: getPaymentDisplayLabel(payment),
                        })}
                        className="h-52 w-full rounded-lg object-cover transition duration-fast group-hover:scale-[1.01]"
                        loading="lazy"
                      />
                    </a>
                  ) : (
                    <div className="rounded-lg bg-surface-subtle/80 px-3 py-2.5 text-sm text-text-secondary">
                      {t('payments.detail.screenshotMissing')}
                    </div>
                  )}
                </div>
              </PageCard>

              <PageCard>
                <div className="grid gap-4">
                  <h3 className="m-0 text-[1rem] font-semibold text-text-primary">
                    {t('payments.detail.sectionLifecycle')}
                  </h3>
                  <dl className="m-0 grid gap-2">
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5">
                      <dt className={labelClassName}>{t('payments.detail.createdAt')}</dt>
                      <dd className={`m-0 ${valueClassName}`}>
                        {formatDateTime(
                          payment.created_at,
                          i18n.language,
                          locale,
                          t('payments.notAvailable'),
                        )}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5">
                      <dt className={labelClassName}>{t('payments.detail.updatedAt')}</dt>
                      <dd className={`m-0 ${valueClassName}`}>
                        {formatDateTime(
                          payment.updated_at,
                          i18n.language,
                          locale,
                          t('payments.notAvailable'),
                        )}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5">
                      <dt className={labelClassName}>{t('payments.detail.reviewedAt')}</dt>
                      <dd className={`m-0 ${valueClassName}`}>
                        {formatDateTime(
                          payment.reviewed_at,
                          i18n.language,
                          locale,
                          t('payments.notAvailable'),
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              </PageCard>

              {actionError ? (
                <p className="m-0 rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
                  {actionError}
                </p>
              ) : null}

              <PageCard>
                <div className="grid gap-3">
                  {!canManagePayments ? (
                    <p className="m-0 rounded-lg bg-surface-subtle/90 px-3 py-2.5 text-sm text-text-secondary">
                      {t('payments.detail.readOnlyHint')}
                    </p>
                  ) : null}

                  {canManagePayments && payment.status === 'pending' ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className={`${actionButtonClassName} bg-success text-white hover:brightness-95 focus-visible:ring-success/35`}
                        onClick={() => void handleAction('approve', onApprove)}
                        disabled={Boolean(actionLoading)}
                      >
                        <FiCheckCircle className="h-4 w-4" />
                        {actionLoading === 'approve'
                          ? t('payments.actions.approving')
                          : t('payments.actions.approve')}
                      </button>
                      <button
                        type="button"
                        className={`${actionButtonClassName} bg-danger text-white hover:brightness-95 focus-visible:ring-danger/35`}
                        onClick={() => void handleAction('reject', onReject)}
                        disabled={Boolean(actionLoading)}
                      >
                        <FiXCircle className="h-4 w-4" />
                        {actionLoading === 'reject'
                          ? t('payments.actions.rejecting')
                          : t('payments.actions.reject')}
                      </button>
                    </div>
                  ) : null}

                  {canManagePayments && payment.status === 'approved' ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className={`${actionButtonClassName} bg-info text-white hover:brightness-95 focus-visible:ring-info/35`}
                        onClick={() => void handleAction('verify', onVerify)}
                        disabled={Boolean(actionLoading)}
                      >
                        <FiShield className="h-4 w-4" />
                        {actionLoading === 'verify'
                          ? t('payments.actions.verifying')
                          : t('payments.actions.verify')}
                      </button>
                    </div>
                  ) : null}

                  {canManagePayments ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-danger-bg px-4 text-sm font-semibold text-danger transition duration-fast hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30"
                        onClick={() => onDelete(payment)}
                      >
                        <FiTrash2 className="h-4 w-4" />
                        {t('payments.actions.delete')}
                      </button>
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

export default PaymentDetailPanel;
