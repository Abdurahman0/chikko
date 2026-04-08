import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { FiImage, FiTrash2 } from 'react-icons/fi';
import AppIcon from '../../../components/shared/icons/AppIcon';
import { FilterSelect, Switch } from '../../../components/shared/data';
import { DEFAULT_CURRENCY_CODE } from '../../../constants';
import { services } from '../../../services';
import type { Product, ProductMutationInput, SelectOption } from '../../../types/domain';
import { useTranslation } from 'react-i18next';

interface ProductFormPanelProps {
  mode: 'create' | 'edit';
  product?: Product | null;
  currencyOptions: SelectOption[];
  categoryOptions: SelectOption[];
  isCategoryOptionsLoading?: boolean;
  brandOptions: SelectOption[];
  isBrandOptionsLoading?: boolean;
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
  minimalStock: string;
  isPromoted: boolean;
  reviewsEnabled: boolean;
  isActive: boolean;
  categoryId: string;
  brandId: string;
}

const PRODUCT_FETCH_BATCH_SIZE = 200;

const inputClassName = [
  'w-full rounded-lg border border-border-soft/60 bg-surface-card px-3.5 py-2.5 text-sm font-medium text-text-primary',
  'placeholder:text-text-muted outline-none transition duration-fast',
  'focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
  'disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

function normalizeString(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

function findOptionByLabel(
  options: SelectOption[],
  label: string,
): SelectOption | undefined {
  const normalizedLabel = normalizeString(label).toLocaleLowerCase();
  if (!normalizedLabel) {
    return undefined;
  }

  return options.find(
    (option) => option.label.trim().toLocaleLowerCase() === normalizedLabel,
  );
}

function resolveInitialCategoryId(
  product: Product,
  categoryOptions: SelectOption[],
): string {
  const directCategoryId = normalizeString(product.categoryId);
  if (directCategoryId.length > 0) {
    return directCategoryId;
  }

  const categoryRawValue = normalizeString(product.category as unknown as string);
  if (categoryRawValue && isUuid(categoryRawValue)) {
    return categoryRawValue;
  }

  const categoryName = normalizeString(product.categoryName || (product.category?.name));
  if (!categoryName) {
    return '';
  }

  return findOptionByLabel(categoryOptions, categoryName)?.value ?? '';
}

function resolveInitialBrandId(
  product: Product,
  brandOptions: SelectOption[],
): string {
  const directBrandId = normalizeString(product.brandId);
  if (directBrandId.length > 0) {
    return directBrandId;
  }

  const brandRawValue = normalizeString(product.brand as unknown as string);
  if (brandRawValue && isUuid(brandRawValue)) {
    return brandRawValue;
  }

  const brandName = normalizeString(product.brandName || (product.brand?.name));
  if (!brandName) {
    return '';
  }

  return findOptionByLabel(brandOptions, brandName)?.value ?? '';
}

function normalizeSkuPrefix(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function createSku(prefix: string, sequence: number): string {
  return `${prefix}-${String(Math.max(1, sequence)).padStart(3, '0')}`;
}

function belongsToCategory(product: Product, categoryId: string): boolean {
  const normalizedCategoryId = normalizeString(product.categoryId);
  if (normalizedCategoryId === categoryId) {
    return true;
  }

  const normalizedCategory = normalizeString(product.category as unknown as string);
  return normalizedCategory === categoryId;
}

function extractSequenceFromSku(sku: string, prefix: string): number {
  const normalizedSku = normalizeString(sku).toUpperCase();
  const normalizedPrefix = normalizeString(prefix).toUpperCase();

  if (!normalizedSku.startsWith(normalizedPrefix)) {
    return 0;
  }

  const suffix = normalizedSku.substring(normalizedPrefix.length).replace(/^[-_]+/, '');
  const match = suffix.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

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
      minimalStock: String(product.minimalStock ?? 0),
      isPromoted: product.isPromoted,
      reviewsEnabled: product.reviewsEnabled,
      isActive: product.isActive,
      categoryId:
        normalizeString(product.categoryId) ||
        (product.category?.id && isUuid(product.category.id) ? product.category.id : ''),
      brandId:
        normalizeString(product.brandId) ||
        (product.brand?.id && isUuid(product.brand.id) ? product.brand.id : ''),
    };
  }

  return {
    name: '',
    sku: '',
    description: '',
    price: '',
    currency: fallbackCurrency,
    stockQuantity: '0',
    minimalStock: '0',
    isPromoted: false,
    reviewsEnabled: true,
    isActive: true,
    categoryId: '',
    brandId: '',
  };
}

function ProductFormPanel({
  mode,
  product,
  currencyOptions,
  categoryOptions,
  brandOptions,
  isCategoryOptionsLoading = false,
  isBrandOptionsLoading = false,
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
  const [isGeneratingSku, setIsGeneratingSku] = useState(false);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);

  useEffect(() => {
    setForm(createInitialState(mode, product, currencyOptions));
    setFieldError(null);
    setIsGeneratingSku(false);
    setNewImages([]);
    setDeletedImageIds([]);
  }, [mode, product, currencyOptions]);

  useEffect(() => {
    if (mode !== 'edit' || !product || form.categoryId || categoryOptions.length === 0) {
      return;
    }

    const resolvedCategoryId = resolveInitialCategoryId(product, categoryOptions);
    if (!resolvedCategoryId) {
      return;
    }

    setForm((current) =>
      current.categoryId
        ? current
        : {
            ...current,
            categoryId: resolvedCategoryId,
          },
    );
  }, [mode, product, categoryOptions, form.categoryId]);

  useEffect(() => {
    if (mode !== 'edit' || !product || form.brandId || brandOptions.length === 0) {
      return;
    }

    const resolvedBrandId = resolveInitialBrandId(product, brandOptions);
    if (!resolvedBrandId) {
      return;
    }

    setForm((current) =>
      current.brandId
        ? current
        : {
            ...current,
            brandId: resolvedBrandId,
          },
    );
  }, [mode, product, brandOptions, form.brandId]);

  useEffect(() => {
    if (mode !== 'create') {
      return;
    }

    const normalizedCategoryId = form.categoryId.trim();
    if (!normalizedCategoryId) {
      setIsGeneratingSku(false);
      setForm((current) => ({ ...current, sku: '' }));
      return;
    }

    const selectedCategory = categoryOptions.find(
      (option) => option.value === normalizedCategoryId,
    );
    const prefix =
      normalizeSkuPrefix(selectedCategory?.label || '') ||
      normalizeSkuPrefix(selectedCategory?.description || '');

    if (!prefix) {
      setIsGeneratingSku(false);
      setForm((current) => ({ ...current, sku: '' }));
      return;
    }

    let isActive = true;

    async function generateSku() {
      setIsGeneratingSku(true);

      try {
        const result = await services.products.listProducts({
          page: 1,
          pageSize: 1,
          category: normalizedCategoryId,
          ordering: '-sku',
        });

        if (!isActive) {
          return;
        }

        const highestProduct = result.items[0];
        const currentMaxSequence = highestProduct
          ? extractSequenceFromSku(highestProduct.sku || '', prefix)
          : 0;

        setForm((current) => {
          if (current.categoryId.trim() !== normalizedCategoryId) {
            return current;
          }

          return {
            ...current,
            sku: createSku(prefix, currentMaxSequence + 1),
          };
        });
      } catch {
        if (!isActive) {
          return;
        }

        setForm((current) => {
          if (current.categoryId.trim() !== normalizedCategoryId) {
            return current;
          }

          return {
            ...current,
            sku: createSku(prefix, 1),
          };
        });
      } finally {
        if (isActive) {
          setIsGeneratingSku(false);
        }
      }
    }

    void generateSku();

    return () => {
      isActive = false;
    };
  }, [mode, form.categoryId, categoryOptions]);

  const categorySelectOptions = useMemo<SelectOption[]>(() => {
    const baseOptions = [
      { value: '', label: t('shared.filterSelect.select') },
      ...categoryOptions,
    ];

    if (!form.categoryId) {
      return baseOptions;
    }

    const hasCurrent = baseOptions.some((option) => option.value === form.categoryId);
    if (hasCurrent) {
      return baseOptions;
    }

    const fallbackLabel =
      normalizeString(product?.categoryName) ||
      normalizeString(product?.category?.name) ||
      form.categoryId;

    return [
      ...baseOptions,
      {
        value: form.categoryId,
        label: fallbackLabel,
      },
    ];
  }, [categoryOptions, form.categoryId, product, t]);

  const brandSelectOptions = useMemo<SelectOption[]>(() => {
    const baseOptions = [
      { value: '', label: t('shared.filterSelect.select') },
      ...brandOptions,
    ];

    if (!form.brandId) {
      return baseOptions;
    }

    const hasCurrent = baseOptions.some((option) => option.value === form.brandId);
    if (hasCurrent) {
      return baseOptions;
    }

    const fallbackLabel =
      normalizeString(product?.brandName) ||
      normalizeString(product?.brand?.name) ||
      form.brandId;

    return [
      ...baseOptions,
      {
        value: form.brandId,
        label: fallbackLabel,
      },
    ];
  }, [brandOptions, form.brandId, product, t]);

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
      form.categoryId.trim().length > 0 &&
      form.currency.trim().length > 0 &&
      Number(form.price) >= 0 &&
      Number(form.stockQuantity) >= 0 &&
      Number(form.minimalStock) >= 0 &&
      !isGeneratingSku
    );
  }, [form, isGeneratingSku]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);

    const normalizedName = form.name.trim();
    const normalizedSku = form.sku.trim().toUpperCase();
    const normalizedDescription = form.description.trim();
    const normalizedCategoryId = form.categoryId.trim();
    const parsedPrice = Number(form.price);
    const parsedStock = Number(form.stockQuantity);
    const parsedMinimalStock = Number(form.minimalStock);

    if (
      !normalizedName ||
      !normalizedSku ||
      !normalizedDescription ||
      !normalizedCategoryId ||
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
    if (!Number.isFinite(parsedMinimalStock) || parsedMinimalStock < 0) {
      setFieldError(
        t('products.form.minimalStockError', {
          defaultValue: "Minimal zaxira soni musbat yoki nol butun son bo'lishi kerak.",
        }),
      );
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
      categoryId: normalizedCategoryId,
      brandId: form.brandId.trim() || null,
      price: parsedPrice,
      currency: form.currency,
      stockQuantity: Math.floor(parsedStock),
      minimalStock: Math.floor(parsedMinimalStock),
      isPromoted: form.isPromoted,
      reviewsEnabled: form.reviewsEnabled,
      isActive: form.isActive,
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
                  setForm((current) =>
                    mode === 'create'
                      ? current
                      : { ...current, sku: event.target.value }
                  )
                }
                className={inputClassName}
                placeholder="CHK-0001"
                disabled={isSubmitting}
                readOnly={mode === 'create'}
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

            {mode === 'create' ? (
              <p className="m-0 text-[12px] text-text-muted sm:col-span-2">
                {isGeneratingSku
                  ? t('common.loading')
                  : t('products.form.skuAutoHint')}
              </p>
            ) : null}
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

          <div className="grid gap-3 sm:grid-cols-3">
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

            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="product-form-minimal-stock">
                {t('products.form.minimalStock', { defaultValue: 'Minimal zaxira limiti' })}
              </label>
              <input
                id="product-form-minimal-stock"
                type="number"
                min="0"
                step="1"
                value={form.minimalStock}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    minimalStock: event.target.value,
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

          <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-card px-4 py-4 ring-1 ring-border-soft/35">
            <div className="grid gap-0.5">
              <p className="m-0 text-sm font-semibold text-text-primary">
                {t('products.form.promotedProduct')}
              </p>
              <p className="m-0 text-[12px] text-text-secondary">
                {t('products.form.promotedProductHint')}
              </p>
            </div>
            <Switch
              checked={form.isPromoted}
              onChange={(nextValue) =>
                setForm((current) => ({ ...current, isPromoted: nextValue }))
              }
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-card px-4 py-4 ring-1 ring-border-soft/35">
            <div className="grid gap-0.5">
              <p className="m-0 text-sm font-semibold text-text-primary">
                {t('products.form.reviewsEnabled', {
                  defaultValue: 'Sharhlarni qabul qilish',
                })}
              </p>
              <p className="m-0 text-[12px] text-text-secondary">
                {t('products.form.reviewsEnabledHint', {
                  defaultValue: 'Ushbu mahsulot uchun sharhlarni yoqish yoki o‘chirish.',
                })}
              </p>
            </div>
            <Switch
              checked={form.reviewsEnabled}
              onChange={(nextValue) =>
                setForm((current) => ({ ...current, reviewsEnabled: nextValue }))
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className={labelClassName}>{t('products.form.category')}</label>
              <FilterSelect
                value={form.categoryId}
                options={categorySelectOptions}
                onChange={(value) =>
                  setForm((current) => ({ ...current, categoryId: value }))
                }
                disabled={isSubmitting || isCategoryOptionsLoading}
              />
            </div>

            <div className="grid gap-1.5">
              <label className={labelClassName}>{t('products.form.brand', { defaultValue: 'Brend' })}</label>
              <FilterSelect
                value={form.brandId}
                options={brandSelectOptions}
                onChange={(value) =>
                  setForm((current) => ({ ...current, brandId: value }))
                }
                disabled={isSubmitting || isBrandOptionsLoading}
              />
            </div>
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
