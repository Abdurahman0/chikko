import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { FiImage, FiTrash2 } from 'react-icons/fi';
import AppIcon from '../../../components/shared/icons/AppIcon';
import { FilterSelect, Switch } from '../../../components/shared/data';
import { DEFAULT_CURRENCY_CODE } from '../../../constants';
import type { Product, ProductMutationInput, SelectOption } from '../../../types/domain';
import { useTranslation } from 'react-i18next';

interface ProductFormPanelProps {
  mode: 'create' | 'edit';
  product?: Product | null;
  currencyOptions: SelectOption[];
  isSubmitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (
    payload: ProductMutationInput,
    options: {
      newImages: File[];
      deletedImageIds: string[];
    },
  ) => void;
}

interface ProductFormState {
  name: string;
  sku: string;
  description: string;
  price: string;
  currency: string;
  stockQuantity: string;
  isActive: boolean;
  category: string;
}

const inputClassName = [
  'w-full rounded-lg border border-border-soft/60 bg-surface-card px-3.5 py-2.5 text-sm font-medium text-text-primary',
  'placeholder:text-text-muted outline-none transition duration-fast',
  'focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
  'disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

function createInitialState(
  mode: 'create' | 'edit',
  product: Product | null | undefined,
  currencyOptions: SelectOption[],
): ProductFormState {
  const fallbackCurrency = currencyOptions[0]?.value ?? DEFAULT_CURRENCY_CODE;

  if (mode === 'edit' && product) {
    return {
      name: product.name,
      sku: product.sku ?? '',
      description: product.description ?? '',
      price: String(product.price),
      currency: product.currency,
      stockQuantity: String(product.stockQuantity ?? 0),
      isActive: product.isActive,
      category:
        product.category ??
        (typeof product.metadata?.category === 'string'
          ? product.metadata.category
          : typeof product.metadata?.category === 'number' ||
              typeof product.metadata?.category === 'boolean'
            ? String(product.metadata.category)
            : ''),
    };
  }

  return {
    name: '',
    sku: '',
    description: '',
    price: '',
    currency: fallbackCurrency,
    stockQuantity: '0',
    isActive: true,
    category: '',
  };
}

function ProductFormPanel({
  mode,
  product,
  currencyOptions,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}: ProductFormPanelProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<ProductFormState>(() =>
    createInitialState(mode, product, currencyOptions),
  );
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);

  useEffect(() => {
    setForm(createInitialState(mode, product, currencyOptions));
    setFieldError(null);
    setNewImages([]);
    setDeletedImageIds([]);
  }, [mode, product, currencyOptions]);

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
    return (
      form.name.trim().length > 0 &&
      form.sku.trim().length > 0 &&
      form.description.trim().length > 0 &&
      form.category.trim().length > 0 &&
      form.currency.trim().length > 0 &&
      Number(form.price) >= 0 &&
      Number(form.stockQuantity) >= 0
    );
  }, [form]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);

    const normalizedName = form.name.trim();
    const normalizedSku = form.sku.trim().toUpperCase();
    const normalizedDescription = form.description.trim();
    const normalizedCategory = form.category.trim();
    const parsedPrice = Number(form.price);
    const parsedStock = Number(form.stockQuantity);

    if (
      !normalizedName ||
      !normalizedSku ||
      !normalizedDescription ||
      !normalizedCategory ||
      !form.currency.trim()
    ) {
      setFieldError(t('products.form.requiredError'));
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setFieldError(t('products.form.priceError'));
      return;
    }

    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      setFieldError(t('products.form.stockError'));
      return;
    }

    if (mode === 'create') {
      if (newImages.length < 1) {
        setFieldError(t('products.form.imagesMinError'));
        return;
      }

      if (newImages.length > 3) {
        setFieldError(t('products.form.imagesMaxError'));
        return;
      }
    }

    onSubmit({
      name: normalizedName,
      sku: normalizedSku,
      description: normalizedDescription,
      price: parsedPrice,
      currency: form.currency,
      stockQuantity: Math.floor(parsedStock),
      isActive: form.isActive,
      metadata: {
        category: normalizedCategory,
      },
    }, {
      newImages,
      deletedImageIds,
    });
  }

  function handleImagesChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (!files.length) {
      return;
    }

    if (mode === 'create') {
      const remainingSlots = Math.max(0, 3 - newImages.length);
      if (remainingSlots <= 0) {
        setFieldError(t('products.form.imagesMaxError'));
        event.target.value = '';
        return;
      }

      const nextFiles = files.slice(0, remainingSlots);
      if (files.length > remainingSlots) {
        setFieldError(t('products.form.imagesMaxError'));
      } else {
        setFieldError(null);
      }

      setNewImages((current) => [...current, ...nextFiles]);
      event.target.value = '';
      return;
    }

    setFieldError(null);
    setNewImages((current) => [...current, ...files]);
    event.target.value = '';
  }

  function removeNewImage(indexToRemove: number) {
    setNewImages((current) => current.filter((_, index) => index !== indexToRemove));
  }

  function toggleDeleteExistingImage(imageId: string) {
    setDeletedImageIds((current) =>
      current.includes(imageId)
        ? current.filter((id) => id !== imageId)
        : [...current, imageId],
    );
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
        className="h-full w-full overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:max-w-[520px] min-[641px]:p-5"
        onClick={(event) => event.stopPropagation()}
        aria-label={
          mode === 'create'
            ? t('products.form.createTitle')
            : t('products.form.editTitle')
        }
      >
        <header className="mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t('products.form.eyebrow')}
              </p>
              <h2 className="mt-1 font-display text-[1.45rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-text-primary">
                {mode === 'create'
                  ? t('products.form.createTitle')
                  : t('products.form.editTitle')}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {mode === 'create'
                  ? t('products.form.createSubtitle')
                  : t('products.form.editSubtitle')}
              </p>
            </div>

            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary shadow-sm transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-60"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label={t('products.form.close')}
            >
              <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <form className="grid gap-3" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-1.5">
            <label className={labelClassName} htmlFor="product-form-name">
              {t('products.form.name')}
            </label>
            <input
              id="product-form-name"
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              className={inputClassName}
              placeholder={t('products.form.name')}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="product-form-sku">
                SKU
              </label>
              <input
                id="product-form-sku"
                type="text"
                value={form.sku}
                onChange={(event) =>
                  setForm((current) => ({ ...current, sku: event.target.value }))
                }
                className={inputClassName}
                placeholder="CHK-0001"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <span className={labelClassName}>{t('products.form.currency')}</span>
              <FilterSelect
                value={form.currency}
                options={currencyOptions}
                onChange={(value) =>
                  setForm((current) => ({ ...current, currency: value }))
                }
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label className={labelClassName} htmlFor="product-form-description">
              {t('products.form.description')}
            </label>
            <textarea
              id="product-form-description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className={`${inputClassName} min-h-[110px] resize-y`}
              placeholder={t('products.form.description')}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="product-form-price">
                {t('products.form.price')}
              </label>
              <input
                id="product-form-price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) =>
                  setForm((current) => ({ ...current, price: event.target.value }))
                }
                className={inputClassName}
                placeholder="0.00"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="product-form-stock">
                {t('products.form.stockQuantity')}
              </label>
              <input
                id="product-form-stock"
                type="number"
                min="0"
                step="1"
                value={form.stockQuantity}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    stockQuantity: event.target.value,
                  }))
                }
                className={inputClassName}
                placeholder="0"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-card px-4 py-4 ring-1 ring-border-soft/35">
            <div className="grid gap-0.5">
              <p className="m-0 text-sm font-semibold text-text-primary">
                {t('products.form.activeProduct')}
              </p>
              <p className="m-0 text-[12px] text-text-secondary">
                {t('products.form.activeProductHint')}
              </p>
            </div>
            <Switch
              checked={form.isActive}
              onChange={(nextValue) =>
                setForm((current) => ({ ...current, isActive: nextValue }))
              }
              disabled={isSubmitting}
            />
          </div>

          {mode === 'edit' && product ? (
            <div className="grid gap-1.5">
              <p className={labelClassName}>{t('products.form.currentImages')}</p>
              {product.images.length ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {product.images.map((image) => {
                    const markedForDelete = deletedImageIds.includes(image.id);

                    return (
                      <div
                        key={image.id}
                        className={[
                          'relative aspect-square overflow-hidden rounded-md ring-1',
                          markedForDelete
                            ? 'opacity-50 ring-danger/35'
                            : 'ring-border-soft/45',
                        ].join(' ')}
                      >
                        <img
                          src={image.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                        <button
                          type="button"
                          className={[
                            'absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-md',
                            markedForDelete
                              ? 'bg-danger text-white'
                              : 'bg-background-subtle/90 text-danger',
                          ].join(' ')}
                          onClick={() => toggleDeleteExistingImage(image.id)}
                          disabled={isSubmitting}
                          aria-label={t('products.form.removeImage')}
                        >
                          <FiTrash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg bg-surface-subtle/80 px-3 py-3 text-sm font-medium text-text-secondary">
                  {t('products.form.noImages')}
                </div>
              )}
            </div>
          ) : null}

          <div className="grid gap-1.5">
            <label className={labelClassName} htmlFor="product-form-images">
              {t('products.form.images')}
            </label>
            <div className="rounded-lg border border-dashed border-border-soft/70 bg-surface-card p-3">
              <input
                id="product-form-images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImagesChange}
                disabled={isSubmitting}
                className="block w-full cursor-pointer text-sm text-text-secondary file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary/12 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-text-accent hover:file:bg-primary/16"
              />
            </div>

            {newImages.length ? (
              <div className="grid gap-2">
                {newImages.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between gap-2 rounded-lg bg-surface-subtle/80 px-3 py-2"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-text-secondary">
                      <FiImage className="h-4 w-4 shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </span>
                    <button
                      type="button"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-danger-bg text-danger transition duration-fast hover:brightness-95"
                      onClick={() => removeNewImage(index)}
                      disabled={isSubmitting}
                      aria-label={t('products.form.removeImage')}
                    >
                      <FiTrash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-1.5">
            <label className={labelClassName} htmlFor="product-form-category">
              {t('products.form.category')}
            </label>
            <input
              id="product-form-category"
              type="text"
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({ ...current, category: event.target.value }))
              }
              className={inputClassName}
              placeholder={t('products.form.categoryPlaceholder')}
              disabled={isSubmitting}
              required
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
                  ? t('products.form.creating')
                  : t('products.form.saving')
                : mode === 'create'
                  ? t('products.form.createSubmit')
                  : t('products.form.editSubmit')}
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

export default ProductFormPanel;
