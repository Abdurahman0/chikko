import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '../../../components/shared/data';
import type { ProductCategory } from '../../../types/domain';

interface ProductCategoryFormDialogProps {
  mode: 'create' | 'edit';
  category?: ProductCategory | null;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    code: string;
    description: string;
    isActive: boolean;
    image?: File | null;
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

function ProductCategoryFormDialog({
  mode,
  category,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}: ProductCategoryFormDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'edit' && category) {
      setName(category.name);
      setDescription(category.description ?? '');
      setIsActive(category.isActive);
      setImageFile(null);
      setImagePreview(category.imageUrl ?? null);
      return;
    }

    setName('');
    setDescription('');
    setIsActive(true);
    setImageFile(null);
    setImagePreview(null);
  }, [mode, category]);

  const code = useMemo(() => name.trim().toLocaleLowerCase(), [name]);

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setImageFile(file);

    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
    } else {
      setImagePreview(mode === 'edit' && category?.imageUrl ? category.imageUrl : null);
    }
  }

  function handleRemoveImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);

    const normalizedName = name.trim();
    if (!normalizedName) {
      setFieldError(t('products.categoryForm.requiredError'));
      return;
    }

    onSubmit({
      name: normalizedName,
      code: normalizedName.toLocaleLowerCase(),
      description: description.trim(),
      isActive,
      image: imageFile,
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
        aria-label={t('products.categoryForm.ariaLabel')}
      >
        <div className="grid gap-2">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            {t('products.categoryForm.eyebrow')}
          </p>
          <h2 className="m-0 font-display text-[1.24rem] font-extrabold leading-[1.1] tracking-[-0.02em] text-text-primary">
            {mode === 'create'
              ? t('products.categoryForm.createTitle')
              : t('products.categoryForm.editTitle')}
          </h2>
          <p className="m-0 text-sm leading-6 text-text-secondary">
            {mode === 'create'
              ? t('products.categoryForm.createSubtitle')
              : t('products.categoryForm.editSubtitle')}
          </p>
        </div>

        <form className="mt-4 grid gap-3" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-1.5">
            <label className={labelClassName} htmlFor="product-category-name">
              {t('products.categoryForm.name')}
            </label>
            <input
              id="product-category-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClassName}
              placeholder={t('products.categoryForm.namePlaceholder')}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="grid gap-1.5">
            <label className={labelClassName} htmlFor="product-category-code-preview">
              {t('products.categoryForm.code')}
            </label>
            <input
              id="product-category-code-preview"
              type="text"
              value={code}
              className={inputClassName}
              disabled
              readOnly
            />
          </div>

          <div className="grid gap-1.5">
            <label className={labelClassName} htmlFor="product-category-description">
              {t('products.categoryForm.description')}
            </label>
            <textarea
              id="product-category-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={`${inputClassName} min-h-[110px] resize-y`}
              placeholder={t('products.categoryForm.descriptionPlaceholder')}
              disabled={isSubmitting}
            />
          </div>

          {/* Image upload */}
          <div className="grid gap-1.5">
            <span className={labelClassName}>
              {t('products.categoryForm.image', { defaultValue: 'Rasm' })}
            </span>
            <div className="flex items-center gap-3">
              {imagePreview ? (
                <div className="relative shrink-0">
                  <img
                    src={imagePreview}
                    alt={name || 'Category'}
                    className="h-16 w-16 rounded-lg object-cover ring-1 ring-border-soft/45"
                  />
                  <button
                    type="button"
                    className="absolute -right-1.5 -top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white text-[10px] font-bold shadow-sm transition hover:brightness-90"
                    onClick={handleRemoveImage}
                    disabled={isSubmitting}
                    aria-label={t('common.remove', { defaultValue: "O'chirish" })}
                  >
                    ✕
                  </button>
                </div>
              ) : null}
              <label
                className={[
                  'inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border-soft/60 px-3.5 py-2.5 text-sm font-medium text-text-secondary transition duration-fast',
                  'hover:border-primary/50 hover:text-text-primary',
                  isSubmitting ? 'pointer-events-none opacity-60' : '',
                ].join(' ')}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {t('products.categoryForm.uploadImage', { defaultValue: 'Rasm yuklash' })}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={isSubmitting}
                />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-card px-4 py-4 ring-1 ring-border-soft/35">
            <div className="grid gap-0.5">
              <p className="m-0 text-sm font-semibold text-text-primary">
                {t('products.categoryForm.active')}
              </p>
              <p className="m-0 text-[12px] text-text-secondary">
                {t('products.categoryForm.activeHint')}
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
                  ? t('products.categoryForm.creating')
                  : t('products.categoryForm.saving')
                : mode === 'create'
                  ? t('products.categoryForm.create')
                  : t('products.categoryForm.save')}
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

export default ProductCategoryFormDialog;
