import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '../../../components/shared/data';
import type { ProductBrand } from '../../../types/domain';

interface ProductBrandFormDialogProps {
  mode: 'create' | 'edit';
  brand?: ProductBrand | null;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    code: string;
    description: string;
    isActive: boolean;
  }) => void;
}

const inputClassName = [
  'w-full rounded-lg border border-border-soft/60 bg-surface-card px-3.5 py-2.5 text-sm font-medium text-text-primary',
  'placeholder:text-text-muted outline-none transition duration-fast',
  'focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
  'disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

function ProductBrandFormDialog({
  mode,
  brand,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}: ProductBrandFormDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'edit' && brand) {
      setName(brand.name);
      setDescription(brand.description ?? '');
      setIsActive(brand.isActive);
      return;
    }

    setName('');
    setDescription('');
    setIsActive(true);
  }, [mode, brand]);

  const code = useMemo(() => name.trim().toLocaleLowerCase(), [name]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);

    const normalizedName = name.trim();
    if (!normalizedName) {
      setFieldError(t('products.brandForm.requiredError', { defaultValue: 'Brend nomini kiriting.' }));
      return;
    }

    onSubmit({
      name: normalizedName,
      code: normalizedName.toLocaleLowerCase(),
      description: description.trim(),
      isActive,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background-overlay/64 px-4 backdrop-blur-[2px]"
      onClick={() => {
        if (!isSubmitting) {
          onClose();
        }
      }}
      role="presentation"
    >
      <section
        className="w-full max-w-[460px] rounded-2xl bg-surface-card p-5 shadow-xl ring-1 ring-border-soft/45"
        onClick={(event) => event.stopPropagation()}
        aria-label={t('products.brandForm.ariaLabel', { defaultValue: 'Brend qo\'shish formasi' })}
      >
        <div className="grid gap-2">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            {t('products.brandForm.eyebrow', { defaultValue: 'Brend formasi' })}
          </p>
          <h2 className="m-0 font-display text-[1.24rem] font-extrabold leading-[1.1] tracking-[-0.02em] text-text-primary">
            {mode === 'create'
              ? t('products.brandForm.createTitle', { defaultValue: 'Yangi Brend' })
              : t('products.brandForm.editTitle', { defaultValue: 'Brendni tahrirlash' })}
          </h2>
          <p className="m-0 text-sm leading-6 text-text-secondary">
            {mode === 'create'
              ? t('products.brandForm.createSubtitle', { defaultValue: 'Mahsulotlar uchun yangi brend qo\'shing.' })
              : t('products.brandForm.editSubtitle', { defaultValue: 'Brend ma\'lumotlarini yangilang.' })}
          </p>
        </div>

        <form className="mt-4 grid gap-3" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-1.5">
            <label className={labelClassName} htmlFor="product-brand-name">
              {t('products.brandForm.name', { defaultValue: 'Brend nomi' })}
            </label>
            <input
              id="product-brand-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClassName}
              placeholder={t('products.brandForm.namePlaceholder', { defaultValue: 'Masalan: Nestle' })}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="grid gap-1.5">
            <label className={labelClassName} htmlFor="product-brand-code-preview">
              {t('products.brandForm.code', { defaultValue: 'Kod' })}
            </label>
            <input
              id="product-brand-code-preview"
              type="text"
              value={code}
              className={inputClassName}
              disabled
              readOnly
            />
          </div>

          <div className="grid gap-1.5">
            <label className={labelClassName} htmlFor="product-brand-description">
              {t('products.brandForm.description', { defaultValue: 'Tavsif' })}
            </label>
            <textarea
              id="product-brand-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={`${inputClassName} min-h-[110px] resize-y`}
              placeholder={t('products.brandForm.descriptionPlaceholder', { defaultValue: 'Brend bo\'yicha qisqa tavsif' })}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-card px-4 py-4 ring-1 ring-border-soft/35">
            <div className="grid gap-0.5">
              <p className="m-0 text-sm font-semibold text-text-primary">
                {t('products.brandForm.active', { defaultValue: 'Faol brend' })}
              </p>
              <p className="m-0 text-[12px] text-text-secondary">
                {t('products.brandForm.activeHint', { defaultValue: 'Brendni faol yoki nofaol holatga o\'tkazing.' })}
              </p>
            </div>
            <Switch
              checked={isActive}
              onChange={setIsActive}
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
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting || name.trim().length === 0}
            >
              {isSubmitting
                ? mode === 'create'
                  ? t('products.brandForm.creating', { defaultValue: 'Qo\'shilmoqda...' })
                  : t('products.brandForm.saving', { defaultValue: 'Saqlanmoqda...' })
                : mode === 'create'
                  ? t('products.brandForm.create', { defaultValue: 'Brend qo\'shish' })
                  : t('products.brandForm.save', { defaultValue: 'O\'zgarishlarni saqlash' })}
            </button>
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-surface-subtle px-4 text-sm font-semibold text-text-secondary transition duration-fast hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ProductBrandFormDialog;
