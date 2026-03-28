import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FilterSelect } from '../../../components/shared/data';
import AppIcon from '../../../components/shared/icons/AppIcon';
import type {
  Customer,
  CustomerMutationInput,
  SelectOption,
} from '../../../types/domain';

interface CustomerFormPanelProps {
  mode: 'create' | 'edit';
  customer?: Customer | null;
  leadOptions: SelectOption[];
  operatorOptions: SelectOption[];
  isSubmitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (payload: CustomerMutationInput) => void;
}

interface CustomerFormState {
  fullName: string;
  phone: string;
  address: string;
  notes: string;
  leadId: string;
  operatorId: string;
}

const inputClassName = [
  'w-full rounded-lg border border-border-soft/60 bg-surface-card px-3.5 py-2.5 text-sm font-medium text-text-primary',
  'placeholder:text-text-muted outline-none transition duration-fast',
  'focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
  'disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

const EMPTY_OPTION_VALUE = '';

function createInitialState(
  mode: 'create' | 'edit',
  customer: Customer | null | undefined,
): CustomerFormState {
  if (mode === 'edit' && customer) {
    return {
      fullName: customer.fullName,
      phone: customer.contact.phone ?? '',
      address: customer.address?.line1 ?? '',
      notes: customer.notes ?? '',
      leadId: customer.lead?.id ?? EMPTY_OPTION_VALUE,
      operatorId: customer.assignedOperator?.id ?? EMPTY_OPTION_VALUE,
    };
  }

  return {
    fullName: '',
    phone: '',
    address: '',
    notes: '',
    leadId: EMPTY_OPTION_VALUE,
    operatorId: EMPTY_OPTION_VALUE,
  };
}

function CustomerFormPanel({
  mode,
  customer,
  leadOptions,
  operatorOptions,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}: CustomerFormPanelProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<CustomerFormState>(() =>
    createInitialState(mode, customer),
  );
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    setForm(createInitialState(mode, customer));
    setFieldError(null);
  }, [mode, customer]);

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

  const canSubmit = useMemo(() => {
    return form.fullName.trim().length > 0 && form.phone.trim().length > 0;
  }, [form.fullName, form.phone]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);

    const fullName = form.fullName.trim();
    const phone = form.phone.trim();
    const address = form.address.trim();
    const notes = form.notes.trim();

    if (!fullName || !phone) {
      setFieldError(t('customers.form.requiredError'));
      return;
    }

    onSubmit({
      full_name: fullName,
      phone,
      email: '',
      address: address || '',
      notes: notes || '',
      metadata: mode === 'edit' ? customer?.metadata ?? null : null,
      lead: form.leadId || null,
      assigned_operator: form.operatorId || null,
    });
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
        aria-label={
          mode === 'create'
            ? t('customers.form.createTitle')
            : t('customers.form.editTitle')
        }
      >
        <header className="mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t('customers.form.eyebrow')}
              </p>
              <h2 className="mt-1 font-display text-[1.45rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-text-primary">
                {mode === 'create'
                  ? t('customers.form.createTitle')
                  : t('customers.form.editTitle')}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {mode === 'create'
                  ? t('customers.form.createSubtitle')
                  : t('customers.form.editSubtitle')}
              </p>
            </div>

            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary shadow-sm transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-60"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label={t('customers.form.close')}
            >
              <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <form className="grid gap-3" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="customer-form-full-name">
                {t('customers.form.fullName')}
              </label>
              <input
                id="customer-form-full-name"
                type="text"
                value={form.fullName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, fullName: event.target.value }))
                }
                className={inputClassName}
                placeholder={t('customers.form.fullNamePlaceholder')}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="customer-form-phone">
                {t('customers.form.phone')}
              </label>
              <input
                id="customer-form-phone"
                type="tel"
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
                }
                className={inputClassName}
                placeholder="+998 90 123 45 67"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="customer-form-address">
                {t('customers.form.address')}
              </label>
              <input
                id="customer-form-address"
                type="text"
                value={form.address}
                onChange={(event) =>
                  setForm((current) => ({ ...current, address: event.target.value }))
                }
                className={inputClassName}
                placeholder={t('customers.form.addressPlaceholder')}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <span className={labelClassName}>{t('customers.form.lead')}</span>
              <FilterSelect
                value={form.leadId}
                options={leadOptions}
                onChange={(value) =>
                  setForm((current) => ({ ...current, leadId: value }))
                }
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-1.5">
              <span className={labelClassName}>{t('customers.form.operator')}</span>
              <FilterSelect
                value={form.operatorId}
                options={operatorOptions}
                onChange={(value) =>
                  setForm((current) => ({ ...current, operatorId: value }))
                }
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label className={labelClassName} htmlFor="customer-form-notes">
              {t('customers.form.notes')}
            </label>
            <textarea
              id="customer-form-notes"
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              className={`${inputClassName} min-h-[96px] resize-y`}
              placeholder={t('customers.form.notesPlaceholder')}
              disabled={isSubmitting}
            />
          </div>

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
                ? mode === 'create'
                  ? t('customers.form.creating')
                  : t('customers.form.saving')
                : mode === 'create'
                  ? t('customers.form.createSubmit')
                  : t('customers.form.editSubmit')}
            </button>
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-surface-card px-4 text-sm font-semibold text-text-secondary shadow-sm ring-1 ring-border-soft/40 transition duration-fast hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

export default CustomerFormPanel;
