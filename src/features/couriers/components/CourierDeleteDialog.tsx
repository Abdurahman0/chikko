import { useTranslation } from 'react-i18next';
import type { Courier } from '../../../types/domain';

interface CourierDeleteDialogProps {
  courier: Courier;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function getCourierName(courier: Courier): string {
  return (
    courier.firstName.trim() ||
    courier.username ||
    courier.telegramUserId ||
    courier.id
  );
}

function CourierDeleteDialog({
  courier,
  isDeleting,
  onCancel,
  onConfirm,
}: CourierDeleteDialogProps) {
  const { t } = useTranslation();
  const name = getCourierName(courier);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background-overlay/64 px-4 backdrop-blur-[2px]"
      onClick={() => {
        if (!isDeleting) {
          onCancel();
        }
      }}
      role="presentation"
    >
      <section
        className="w-full max-w-[420px] rounded-2xl bg-surface-card p-5 shadow-xl ring-1 ring-border-soft/45"
        onClick={(event) => event.stopPropagation()}
        aria-label={t('couriers.deleteDialog.title', { name })}
      >
        <div className="grid gap-2">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-danger">
            {t('couriers.deleteDialog.eyebrow')}
          </p>
          <h2 className="m-0 font-display text-[1.24rem] font-extrabold leading-[1.1] tracking-[-0.02em] text-text-primary">
            {t('couriers.deleteDialog.title', { name })}
          </h2>
          <p className="m-0 text-sm leading-6 text-text-secondary">
            {t('couriers.deleteDialog.description')}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-danger px-4 text-sm font-semibold text-white transition duration-fast hover:brightness-95 disabled:opacity-60"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting
              ? t('couriers.deleteDialog.deleting')
              : t('couriers.deleteDialog.confirm')}
          </button>
          <button
            type="button"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-surface-subtle px-4 text-sm font-semibold text-text-secondary transition duration-fast hover:bg-surface-muted"
            onClick={onCancel}
            disabled={isDeleting}
          >
            {t('common.cancel')}
          </button>
        </div>
      </section>
    </div>
  );
}

export default CourierDeleteDialog;
