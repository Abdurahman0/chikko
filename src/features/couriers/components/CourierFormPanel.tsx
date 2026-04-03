import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '../../../components/shared/data';
import AppIcon from '../../../components/shared/icons/AppIcon';
import type { Courier, CourierMutationInput } from '../../../types/domain';

interface CourierFormPanelProps {
  mode: 'create' | 'edit';
  courier?: Courier | null;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (payload: CourierMutationInput) => void;
}

const inputClassName = [
  'w-full rounded-lg border border-border-soft/60 bg-surface-card px-3.5 py-2.5 text-sm font-medium text-text-primary',
  'placeholder:text-text-muted outline-none transition duration-fast',
  'focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
  'disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

function CourierFormPanel({
  mode,
  courier,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}: CourierFormPanelProps) {
  const { t } = useTranslation();

  const [firstName, setFirstName] = useState(courier?.firstName ?? '');
  const [telegramUserId, setTelegramUserId] = useState(courier?.telegramUserId ?? '');
  const [username, setUsername] = useState(courier?.username ?? '');
  const [phone, setPhone] = useState(courier?.phone ?? '');
  const [isActive, setIsActive] = useState(courier?.isActive ?? true);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(courier?.firstName ?? '');
    setTelegramUserId(courier?.telegramUserId ?? '');
    setUsername(courier?.username ?? '');
    setPhone(courier?.phone ?? '');
    setIsActive(courier?.isActive ?? true);
    setFieldError(null);
  }, [courier, mode]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);

    if (!firstName.trim()) {
      setFieldError(t('couriers.form.firstNameRequired'));
      return;
    }

    onSubmit({
      firstName: firstName.trim(),
      telegramUserId: telegramUserId.trim(),
      username: username.trim(),
      phone: phone.trim(),
      isActive,
      metadata: mode === 'edit' ? courier?.metadata : undefined,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-background-overlay/72 backdrop-blur-[3px]"
      onClick={() => !isSubmitting && onClose()}
      role="presentation"
    >
      <aside
        className="h-full w-full overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:max-w-[620px] min-[641px]:p-5"
        onClick={(event) => event.stopPropagation()}
        aria-label={
          mode === 'create'
            ? t('couriers.form.titleCreate')
            : t('couriers.form.titleEdit')
        }
      >
        <header className="mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t('couriers.form.eyebrow')}
              </p>
              <h2 className="mt-1 font-display text-[1.45rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-text-primary">
                {mode === 'create'
                  ? t('couriers.form.titleCreate')
                  : t('couriers.form.titleEdit')}
              </h2>
            </div>
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary shadow-sm transition duration-fast hover:bg-surface-muted"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label={t('couriers.form.close')}
            >
              <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <form className="grid gap-3" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="courier-form-first-name">
                {t('couriers.form.firstName')}
              </label>
              <input
                id="courier-form-first-name"
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className={inputClassName}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="courier-form-telegram-id">
                {t('couriers.form.telegramUserId')}
              </label>
              <input
                id="courier-form-telegram-id"
                type="text"
                value={telegramUserId}
                onChange={(event) => setTelegramUserId(event.target.value)}
                className={inputClassName}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="courier-form-username">
                {t('couriers.form.username')}
              </label>
              <input
                id="courier-form-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className={inputClassName}
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="courier-form-phone">
                {t('couriers.form.phone')}
              </label>
              <input
                id="courier-form-phone"
                type="text"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className={inputClassName}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-card px-4 py-4 ring-1 ring-border-soft/35">
            <div className="grid gap-0.5">
              <p className="m-0 text-sm font-semibold text-text-primary">
                {t('couriers.form.isActive')}
              </p>
              <p className="m-0 text-[12px] text-text-secondary">
                {t('couriers.form.isActiveHint')}
              </p>
            </div>
            <Switch
              checked={isActive}
              onChange={setIsActive}
              disabled={isSubmitting}
              ariaLabel={t('couriers.form.isActive')}
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
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? mode === 'create'
                  ? t('couriers.form.creating')
                  : t('couriers.form.saving')
                : mode === 'create'
                  ? t('couriers.form.createSubmit')
                  : t('couriers.form.editSubmit')}
            </button>
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-surface-subtle px-4 text-sm font-semibold text-text-secondary transition duration-fast hover:bg-surface-muted"
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

export default CourierFormPanel;
