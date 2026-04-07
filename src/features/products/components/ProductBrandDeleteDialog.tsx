import { useTranslation } from 'react-i18next';
import type { ProductBrand } from '../../../types/domain';

interface ProductBrandDeleteDialogProps {
  brand: ProductBrand;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function ProductBrandDeleteDialog({
  brand,
  isDeleting,
  onCancel,
  onConfirm,
}: ProductBrandDeleteDialogProps) {
  const { t } = useTranslation();

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
        aria-label={t('products.brandDeleteDialog.ariaLabel', { defaultValue: 'Brendni o\'chirishni tasdiqlash' })}
      >
        <div className="grid gap-2">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-danger">
            {t('products.brandDeleteDialog.eyebrow', { defaultValue: 'Brendni o\'chirish' })}
          </p>
          <h2 className="m-0 font-display text-[1.24rem] font-extrabold leading-[1.1] tracking-[-0.02em] text-text-primary">
            {t('products.brandDeleteDialog.title', { name: brand.name, defaultValue: 'Haqiqatdan ham "{{name}}" brendini o\'chirmoqchimisiz?' })}
          </h2>
          <p className="m-0 text-sm leading-6 text-text-secondary">
            {t('products.brandDeleteDialog.description', { defaultValue: 'Ushbu amalni ortga qaytarib bo\'lmaydi. Ushbu brendga bog\'langan mahsulotlar brendsiz qolishi mumkin.' })}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-danger px-4 text-sm font-semibold text-white transition duration-fast hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/35 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting
              ? t('products.brandDeleteDialog.deleting', { defaultValue: 'O\'chirilmoqda...' })
              : t('products.brandDeleteDialog.confirm', { defaultValue: 'Tasdiqlash' })}
          </button>
          <button
            type="button"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-surface-subtle px-4 text-sm font-semibold text-text-secondary transition duration-fast hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
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

export default ProductBrandDeleteDialog;
