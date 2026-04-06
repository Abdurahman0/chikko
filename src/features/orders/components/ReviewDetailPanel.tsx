import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '../../../components/shared/data';
import AppIcon from '../../../components/shared/icons/AppIcon';
import { PageCard } from '../../../components/shared/page';
import { formatCurrencyAmount } from '../../../constants';
import { formatLocalizedDate } from '../../../i18n/date-format';
import { getChannelLabel, getOrderStatusLabel } from '../../../i18n/labels';
import type { OrderReview } from '../../../types/domain';

interface ReviewDetailPanelProps {
  review: OrderReview;
  customerName?: string;
  leadName?: string;
  onClose: () => void;
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

function ReviewDetailPanel({
  review,
  customerName,
  leadName,
  onClose,
}: ReviewDetailPanelProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';
  const navigate = useNavigate();

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

  const { orderDetail } = review;

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-background-overlay/72 backdrop-blur-[3px]"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="h-full w-full overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:max-w-[560px] min-[641px]:p-5"
        onClick={(event) => event.stopPropagation()}
        aria-label={t('orders.reviews.boardTitle')}
      >
        <header className="mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40 transition duration-base hover:shadow-md hover:ring-border-soft/60">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t('orders.reviews.columns.comment')}
              </p>
              <h2 className="mt-1 font-display text-[1.25rem] font-medium leading-[1.2] text-text-primary [overflow-wrap:anywhere]">
                {review.comment || t('common.na')}
              </h2>
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

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-7 items-center gap-1.5 rounded-pill bg-info-bg px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-info">
              <AppIcon name="chat" className="h-3.5 w-3.5" aria-hidden="true" />
              {getChannelLabel(t, review.source)}
            </span>
            <span className="inline-flex min-h-7 items-center rounded-pill bg-surface-subtle px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
              {formatDateTime(review.submittedAt, language, locale, t('common.na'))}
            </span>
          </div>
        </header>

        <div className="grid gap-3">
          <PageCard>
            <div className="grid gap-4">
              <div className="grid gap-1">
                <h3 className="m-0 text-[1rem] font-semibold text-text-primary">
                  {t('orders.detail.sectionContact')}
                </h3>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <div 
                  className={`rounded-lg bg-surface-subtle/80 p-3 transition-colors ${review.customer ? 'cursor-pointer hover:bg-surface-muted/90' : ''}`}
                  onClick={() => {
                    if (review.customer) {
                      navigate('/customers', { state: { selectedCustomerId: review.customer }});
                    }
                  }}
                >
                  <p className={labelClassName}>{t('orders.columns.customerContact')}</p>
                  <p className={`mt-1 ${valueClassName}`}>
                    {orderDetail.contactName || t('common.na')}
                  </p>
                </div>
                <div className="rounded-lg bg-surface-subtle/80 p-3">
                  <p className={labelClassName}>{t('orders.detail.contactPhone')}</p>
                  <p className={`mt-1 ${valueClassName}`}>
                    {orderDetail.contactPhone || t('common.na')}
                  </p>
                </div>
                <div className="rounded-lg bg-surface-subtle/80 p-3 sm:col-span-2">
                  <p className={labelClassName}>{t('orders.detail.shippingAddress')}</p>
                  <p className="mt-1 text-sm leading-6 text-text-secondary [overflow-wrap:anywhere]">
                    {orderDetail.shippingAddress || t('common.na')}
                  </p>
                </div>
                <div 
                  className={`rounded-lg bg-surface-subtle/80 p-3 transition-colors ${review.customer ? 'cursor-pointer hover:bg-surface-muted/90' : ''}`}
                  onClick={() => {
                    if (review.customer) {
                      navigate('/customers', { state: { selectedCustomerId: review.customer }});
                    }
                  }}
                >
                  <p className={labelClassName}>{t('orders.detail.customer')}</p>
                  <p className={`mt-1 ${valueClassName}`}>
                    {customerName || review.customer || t('orders.detail.noCustomer')}
                  </p>
                </div>
                <div 
                  className={`rounded-lg bg-surface-subtle/80 p-3 transition-colors ${review.lead ? 'cursor-pointer hover:bg-surface-muted/90' : ''}`}
                  onClick={() => {
                    if (review.lead) {
                      navigate('/leads', { state: { selectedLeadId: review.lead }});
                    }
                  }}
                >
                  <p className={labelClassName}>{t('orders.detail.lead')}</p>
                  <p className={`mt-1 ${valueClassName}`}>
                    {leadName || review.lead || t('orders.detail.noLead')}
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
                    {orderDetail.items.map((item) => (
                      <tr key={item.id} className="rounded-lg bg-surface-card">
                        <td className="rounded-l-lg px-2 py-2 text-sm font-medium text-text-primary">
                          {item.product}
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
                    {formatCurrencyAmount(orderDetail.totalAmount, locale)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5">
                  <dt className={labelClassName}>{t('orders.columns.status')}</dt>
                  <dd className={`m-0`}>
                    <StatusBadge
                      status={orderDetail.status}
                      label={getOrderStatusLabel(t, orderDetail.status)}
                    />
                  </dd>
                </div>
              </dl>
            </div>
          </PageCard>

        </div>
      </aside>
    </div>
  );
}

export default ReviewDetailPanel;
