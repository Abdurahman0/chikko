import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FilterSelect } from '../../../components/shared/data';
import AppIcon from '../../../components/shared/icons/AppIcon';
import { PAYMENT_METHODS, formatCurrencyAmount } from '../../../constants';
import { getPaymentMethodLabel } from '../../../i18n/labels';
import { useAuth } from '../../../auth';
import type {
  PaymentMethod,
  PaymentMutationInput,
  SelectOption,
} from '../../../types/domain';

interface PaymentFormPanelProps {
  orderOptions: SelectOption[];
  orderSummaryById: Record<
    string,
    {
      amount: number;
      customerName: string;
      customerPhone: string;
      createdAtLabel: string;
    }
  >;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (payload: PaymentMutationInput) => void;
}

interface PaymentFormState {
  amount: string;
  method: PaymentMethod;
  screenshot: string;
  last_four_digits: string;
  order: string;
  verification_reference: string;
}

const inputClassName = [
  'w-full rounded-lg border border-border-soft/60 bg-surface-card px-3.5 py-2.5 text-sm font-medium text-text-primary',
  'placeholder:text-text-muted outline-none transition duration-fast',
  'focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
  'disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

const initialState: PaymentFormState = {
  amount: '',
  method: 'manual',
  screenshot: '',
  last_four_digits: '',
  order: '',
  verification_reference: '',
};

function PaymentFormPanel({
  orderOptions,
  orderSummaryById,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}: PaymentFormPanelProps) {
  const { t, i18n } = useTranslation();
  const { currentUser } = useAuth();
  const [form, setForm] = useState<PaymentFormState>(initialState);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';
  const methodOptions = useMemo<SelectOption[]>(
    () =>
      PAYMENT_METHODS.map((method) => ({
        value: method,
        label: getPaymentMethodLabel(t, method),
      })),
    [t],
  );
  const isManualMethod = form.method === 'manual';
  const submittedByName = useMemo(
    () => currentUser?.fullName?.trim() || currentUser?.email?.trim() || '',
    [currentUser?.email, currentUser?.fullName],
  );
  const selectedOrderSummary = form.order ? orderSummaryById[form.order] : undefined;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSubmitting, onClose]);

  useEffect(() => {
    if (form.order.trim().length > 0 || orderOptions.length === 0) {
      return;
    }

    const defaultOrderId = orderOptions[0]?.value ?? '';
    const defaultAmount = orderSummaryById[defaultOrderId]?.amount;

    setForm((current) => ({
      ...current,
      order: defaultOrderId,
      amount:
        typeof defaultAmount === 'number' && Number.isFinite(defaultAmount)
          ? String(defaultAmount)
          : current.amount,
    }));
  }, [form.order, orderOptions, orderSummaryById]);

  const canSubmit = useMemo(() => {
    return (
      Number(form.amount) > 0 &&
      submittedByName.length > 0 &&
      form.order.trim().length > 0
    );
  }, [form, submittedByName]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFieldError(t('payments.form.amountError'));
      return;
    }

    if (!submittedByName) {
      setFieldError(t('payments.form.submittedByRequired'));
      return;
    }

    if (!form.order.trim()) {
      setFieldError(t('payments.form.orderRequired'));
      return;
    }

    const payload: PaymentMutationInput = {
      amount,
      method: form.method,
      submitted_by_name: submittedByName,
      metadata: null,
      order: form.order.trim(),
    };

    if (!isManualMethod) {
      payload.screenshot = form.screenshot.trim() || '';
      payload.last_four_digits = form.last_four_digits.trim() || '';
      payload.verification_reference = form.verification_reference.trim() || '';
    }

    onSubmit(payload);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-background-overlay/72 backdrop-blur-[3px]"
      onClick={() => {
        if (!isSubmitting) {
          onClose();
        }
      }}
      role="presentation"
    >
      <aside
        className="h-full w-full overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:max-w-[560px] min-[641px]:p-5"
        onClick={(event) => event.stopPropagation()}
        aria-label={t('payments.form.ariaLabel')}
      >
        <header className="mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t('payments.title')}
              </p>
              <h2 className="mt-1 font-display text-[1.45rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-text-primary">
                {t('payments.form.createTitle')}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {t('payments.form.createSubtitle')}
              </p>
            </div>

            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary shadow-sm transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-60"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label={t('payments.form.close')}
            >
              <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <form className="grid gap-3" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="payment-form-amount">
                {t('payments.form.amount')}
              </label>
              <input
                id="payment-form-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({ ...current, amount: event.target.value }))
                }
                className={inputClassName}
                placeholder="0.00"
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <span className={labelClassName}>{t('payments.form.method')}</span>
              <FilterSelect
                value={form.method}
                options={methodOptions}
                onChange={(value) =>
                  setForm((current) => ({ ...current, method: value as PaymentMethod }))
                }
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <span className={labelClassName}>{t('payments.form.submittedBy')}</span>
              <input
                type="text"
                value={submittedByName || t('common.notAvailable')}
                className={inputClassName}
                disabled
                readOnly
              />
            </div>
            <div className="grid gap-1.5">
              <span className={labelClassName}>{t('payments.form.order')}</span>
              <FilterSelect
                value={form.order}
                options={orderOptions}
                onChange={(value) =>
                  setForm((current) => {
                    const selectedAmount = orderSummaryById[value]?.amount;
                    return {
                      ...current,
                      order: value,
                      amount:
                        typeof selectedAmount === 'number' &&
                        Number.isFinite(selectedAmount)
                          ? String(selectedAmount)
                          : current.amount,
                    };
                  })
                }
                disabled={isSubmitting || orderOptions.length === 0}
              />
            </div>
          </div>

          {orderOptions.length === 0 ? (
            <p className="m-0 rounded-lg bg-warning-bg px-3 py-2 text-sm font-medium text-warning">
              {t('payments.form.noEligibleOrders')}
            </p>
          ) : null}

          {selectedOrderSummary ? (
            <div className="grid gap-1.5">
              <span className={labelClassName}>Buyurtma Ma&apos;lumoti</span>
              <div className="rounded-lg bg-surface-card p-3 shadow-sm ring-1 ring-border-soft/40">
                <dl className="grid gap-2">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <dt className="font-semibold uppercase tracking-[0.08em] text-text-muted">
                      {t('customers.columns.customer')}
                    </dt>
                    <dd className="m-0 text-right font-medium text-text-primary">
                      {selectedOrderSummary.customerName || t('common.notAvailable')}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <dt className="font-semibold uppercase tracking-[0.08em] text-text-muted">
                      {t('customers.columns.phone')}
                    </dt>
                    <dd className="m-0 text-right font-medium text-text-primary">
                      {selectedOrderSummary.customerPhone || t('common.notAvailable')}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <dt className="font-semibold uppercase tracking-[0.08em] text-text-muted">
                      {t('payments.detail.createdAt')}
                    </dt>
                    <dd className="m-0 text-right font-medium text-text-primary">
                      {selectedOrderSummary.createdAtLabel || t('common.notAvailable')}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <dt className="font-semibold uppercase tracking-[0.08em] text-text-muted">
                      {t('payments.form.amount')}
                    </dt>
                    <dd className="m-0 text-right text-sm font-semibold text-text-primary">
                      {formatCurrencyAmount(selectedOrderSummary.amount, locale)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          ) : null}

          {!isManualMethod ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label className={labelClassName} htmlFor="payment-form-last-four">
                    {t('payments.form.lastFourDigits')}
                  </label>
                  <input
                    id="payment-form-last-four"
                    type="text"
                    value={form.last_four_digits}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        last_four_digits: event.target.value,
                      }))
                    }
                    className={inputClassName}
                    placeholder="1234"
                    disabled={isSubmitting}
                    maxLength={4}
                  />
                </div>

                <div className="grid gap-1.5">
                  <label className={labelClassName} htmlFor="payment-form-verification">
                    {t('payments.form.verificationReference')}
                  </label>
                  <input
                    id="payment-form-verification"
                    type="text"
                    value={form.verification_reference}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        verification_reference: event.target.value,
                      }))
                    }
                    className={inputClassName}
                    placeholder={t('payments.form.verificationPlaceholder')}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <label className={labelClassName} htmlFor="payment-form-screenshot">
                  {t('payments.form.screenshot')}
                </label>
                <input
                  id="payment-form-screenshot"
                  type="text"
                  value={form.screenshot}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, screenshot: event.target.value }))
                  }
                  className={inputClassName}
                  placeholder={t('payments.form.screenshotPlaceholder')}
                  disabled={isSubmitting}
                />
              </div>
            </>
          ) : null}

          {fieldError ? (
            <p className="m-0 rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
              {fieldError}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="m-0 rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting || !canSubmit}
            >
              {isSubmitting
                ? t('payments.form.creating')
                : t('payments.form.createSubmit')}
            </button>
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-surface-card px-4 text-sm font-semibold text-text-secondary shadow-sm ring-1 ring-border-soft/40 transition duration-fast hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('payments.cancel')}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

export default PaymentFormPanel;
