import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { FiAlertTriangle, FiCamera, FiCheck, FiImage } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import AppIcon from '../../../components/shared/icons/AppIcon';
import { FilterSelect, Switch } from '../../../components/shared/data';
import {
  DEFAULT_CURRENCY_CODE,
  PRODUCT_PHOTO_IMPORT_ACCEPT_ATTRIBUTE,
  PRODUCT_PHOTO_IMPORT_ALLOWED_EXTENSIONS,
  PRODUCT_PHOTO_IMPORT_ALLOWED_MIME_TYPES,
  PRODUCT_PHOTO_IMPORT_BACKGROUND_STAGE_MS,
  PRODUCT_PHOTO_IMPORT_MAX_FILE_SIZE_BYTES,
  PRODUCT_PHOTO_IMPORT_MAX_FILE_SIZE_LABEL,
  PRODUCT_PHOTO_IMPORT_OCR_STAGE_MS,
} from '../../../constants';
import { services } from '../../../services';
import type {
  Product,
  ProductPhotoImportMetadata,
  SelectOption,
} from '../../../types/domain';

interface ProductPhotoImportPanelProps {
  categoryOptions: SelectOption[];
  isCategoryOptionsLoading?: boolean;
  brandOptions: SelectOption[];
  isBrandOptionsLoading?: boolean;
  onClose: () => void;
  /** Invalidates the cached product list on the page behind this panel. */
  onProductsChanged: () => void;
}

/**
 * `unknown-result` is reached when the request left the browser but no answer came
 * back (timeout, aborted upload, dropped connection). The product may exist, so the
 * request is never repeated from that state.
 */
type PhotoImportPhase = 'form' | 'uploading' | 'review' | 'unknown-result' | 'saved';

type PhotoImportField =
  | 'name'
  | 'image'
  | 'categoryId'
  | 'brandId'
  | 'price'
  | 'stockQuantity'
  | 'minimalStock'
  | 'description';

type PhotoImportFieldErrors = Partial<Record<PhotoImportField, string>>;

const PHOTO_IMPORT_STAGES = ['sending', 'background', 'ocr'] as const;

const API_FIELD_TO_FORM_FIELD: Record<string, PhotoImportField> = {
  name: 'name',
  image: 'image',
  category_id: 'categoryId',
  category: 'categoryId',
  brand_id: 'brandId',
  brand: 'brandId',
  price: 'price',
  stock_quantity: 'stockQuantity',
  minimal_stock: 'minimalStock',
  description: 'description',
};

const inputClassName = [
  'w-full rounded-lg border border-border-soft/60 bg-surface-card px-3.5 py-2.5 text-sm font-medium text-text-primary',
  'placeholder:text-text-muted outline-none transition duration-fast',
  'focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
  'disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

const primaryButtonClassName =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-60';

const secondaryButtonClassName =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-surface-card px-4 text-sm font-semibold text-text-secondary shadow-sm ring-1 ring-border-soft/40 transition duration-fast hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60';

const fieldErrorClassName = 'm-0 text-[12px] font-medium text-danger';

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readMessage(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const message = readMessage(entry);
      if (message) {
        return message;
      }
    }
  }

  return null;
}

interface ApiErrorDetails {
  statusCode: number | null;
  code: string | null;
  hasResponse: boolean;
  generalMessage: string | null;
  fieldErrors: PhotoImportFieldErrors;
}

function extractApiErrorDetails(error: unknown): ApiErrorDetails {
  const topLevel = toRecord(error);
  const response = toRecord(topLevel?.response);
  const data = toRecord(response?.data);
  const statusCode = typeof response?.status === 'number' ? response.status : null;
  const code = typeof topLevel?.code === 'string' ? topLevel.code : null;

  const fieldErrors: PhotoImportFieldErrors = {};
  const unmappedMessages: string[] = [];

  if (data) {
    for (const [key, value] of Object.entries(data)) {
      const message = readMessage(value);
      if (!message) {
        continue;
      }

      const formField = API_FIELD_TO_FORM_FIELD[key];
      if (formField) {
        fieldErrors[formField] = message;
        continue;
      }

      unmappedMessages.push(message);
    }
  }

  const generalMessage =
    readMessage(data?.detail) ??
    readMessage(data?.message) ??
    readMessage(data?.non_field_errors) ??
    (unmappedMessages.length > 0 ? unmappedMessages[0] : null) ??
    (Array.isArray(response?.data) ? readMessage(response.data) : null);

  return {
    statusCode,
    code,
    hasResponse: response !== null,
    generalMessage,
    fieldErrors,
  };
}

function isAllowedImageFile(file: File): boolean {
  const mimeType = file.type.trim().toLowerCase();

  if (mimeType.length > 0) {
    return (PRODUCT_PHOTO_IMPORT_ALLOWED_MIME_TYPES as readonly string[]).includes(
      mimeType,
    );
  }

  // Some browsers report an empty MIME type for HEIC/HEIF from the iPhone camera.
  const fileName = file.name.trim().toLowerCase();
  return (PRODUCT_PHOTO_IMPORT_ALLOWED_EXTENSIONS as readonly string[]).some(
    (extension) => fileName.endsWith(extension),
  );
}

function resolveStageIndex(elapsedMs: number): number {
  if (elapsedMs < PRODUCT_PHOTO_IMPORT_BACKGROUND_STAGE_MS) {
    return 0;
  }

  if (elapsedMs < PRODUCT_PHOTO_IMPORT_OCR_STAGE_MS) {
    return 1;
  }

  return 2;
}

function ProductPhotoImportPanel({
  categoryOptions,
  isCategoryOptionsLoading = false,
  brandOptions,
  isBrandOptionsLoading = false,
  onClose,
  onProductsChanged,
}: ProductPhotoImportPanelProps) {
  const { t } = useTranslation();

  const [phase, setPhase] = useState<PhotoImportPhase>('form');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [stockQuantity, setStockQuantity] = useState('0');
  const [minimalStock, setMinimalStock] = useState('0');
  const [extractDescription, setExtractDescription] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewRenderable, setIsPreviewRenderable] = useState(true);

  const [fieldErrors, setFieldErrors] = useState<PhotoImportFieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isRetryable, setIsRetryable] = useState(false);

  const [elapsedMs, setElapsedMs] = useState(0);
  const [createdProduct, setCreatedProduct] = useState<Product | null>(null);
  const [photoImport, setPhotoImport] = useState<ProductPhotoImportMetadata | null>(
    null,
  );
  const [reviewDescription, setReviewDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedAsActive, setSavedAsActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isRequestInFlightRef = useRef(false);
  const hasUploadStartedRef = useRef(false);

  const isBusy = phase === 'uploading' || isSaving;

  const requestClose = useCallback(() => {
    if (isBusy) {
      return;
    }

    onClose();
  }, [isBusy, onClose]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        requestClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [requestClose]);

  useEffect(() => {
    if (!previewUrl) {
      return;
    }

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (phase !== 'uploading') {
      return;
    }

    const startedAt = Date.now();

    const intervalId = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [phase]);

  const needsManualDescription = useMemo(() => {
    if (!photoImport) {
      return false;
    }

    return (
      photoImport.ocrAvailable === false || photoImport.descriptionExtracted === false
    );
  }, [photoImport]);

  useEffect(() => {
    if (phase !== 'review' || !needsManualDescription) {
      return;
    }

    descriptionRef.current?.focus();
  }, [phase, needsManualDescription]);

  const categorySelectOptions = useMemo<SelectOption[]>(
    () => [{ value: '', label: t('shared.filterSelect.select') }, ...categoryOptions],
    [categoryOptions, t],
  );

  const brandSelectOptions = useMemo<SelectOption[]>(
    () => [{ value: '', label: t('shared.filterSelect.select') }, ...brandOptions],
    [brandOptions, t],
  );

  function resetImage() {
    setImageFile(null);
    setPreviewUrl(null);
    setIsPreviewRenderable(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!isAllowedImageFile(file)) {
      resetImage();
      setFieldErrors((current) => ({
        ...current,
        image: t('products.photoImport.errors.imageType'),
      }));
      return;
    }

    if (file.size > PRODUCT_PHOTO_IMPORT_MAX_FILE_SIZE_BYTES) {
      resetImage();
      setFieldErrors((current) => ({
        ...current,
        image: t('products.photoImport.errors.imageSize', {
          limit: PRODUCT_PHOTO_IMPORT_MAX_FILE_SIZE_LABEL,
        }),
      }));
      return;
    }

    setFieldErrors((current) => ({ ...current, image: undefined }));
    setImageFile(file);
    setIsPreviewRenderable(true);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function validateForm(): PhotoImportFieldErrors {
    const errors: PhotoImportFieldErrors = {};

    if (name.trim().length === 0) {
      errors.name = t('products.photoImport.errors.nameRequired');
    }

    if (!imageFile) {
      errors.image = t('products.photoImport.errors.imageRequired');
    }

    const parsedPrice = Number(price.trim());
    if (price.trim().length === 0) {
      errors.price = t('products.photoImport.errors.priceRequired');
    } else if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      errors.price = t('products.photoImport.errors.pricePositive');
    }

    const parsedStock = Number(stockQuantity.trim() || '0');
    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      errors.stockQuantity = t('products.photoImport.errors.stock');
    }

    const parsedMinimalStock = Number(minimalStock.trim() || '0');
    if (!Number.isFinite(parsedMinimalStock) || parsedMinimalStock < 0) {
      errors.minimalStock = t('products.photoImport.errors.minimalStock');
    }

    return errors;
  }

  function applyRequestError(error: unknown) {
    const details = extractApiErrorDetails(error);
    const uploadStarted = hasUploadStartedRef.current;

    // No response at all: either a timeout, an abort, or a dead connection.
    if (!details.hasResponse) {
      if (details.code === 'ECONNABORTED' || details.code === 'ETIMEDOUT') {
        setPhase('unknown-result');
        return;
      }

      if (uploadStarted) {
        // Bytes already left the browser, so the product may exist. Never retry.
        setPhase('unknown-result');
        return;
      }

      setPhase('form');
      setIsRetryable(true);
      setGeneralError(t('products.photoImport.errors.networkBeforeSend'));
      return;
    }

    setPhase('form');
    setIsRetryable(false);

    if (details.statusCode === 401 || details.statusCode === 403) {
      setGeneralError(
        details.statusCode === 401
          ? t('products.photoImport.errors.unauthorized')
          : t('products.photoImport.errors.forbidden'),
      );
      return;
    }

    if (details.statusCode === 413) {
      setFieldErrors({
        image: t('products.photoImport.errors.tooLarge', {
          limit: PRODUCT_PHOTO_IMPORT_MAX_FILE_SIZE_LABEL,
        }),
      });
      return;
    }

    if (details.statusCode === 400 || details.statusCode === 422) {
      setFieldErrors(details.fieldErrors);
      setGeneralError(
        Object.keys(details.fieldErrors).length > 0
          ? details.generalMessage
          : (details.generalMessage ?? t('products.photoImport.errors.validation')),
      );
      return;
    }

    setGeneralError(
      details.generalMessage ?? t('products.photoImport.errors.generic'),
    );
  }

  async function submitPhotoImport() {
    if (isRequestInFlightRef.current || !imageFile) {
      return;
    }

    isRequestInFlightRef.current = true;
    hasUploadStartedRef.current = false;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setFieldErrors({});
    setGeneralError(null);
    setIsRetryable(false);
    setElapsedMs(0);
    setPhase('uploading');

    try {
      const result = await services.products.createProductFromPhoto(
        {
          name: name.trim(),
          image: imageFile,
          // The endpoint defaults is_active to true and creates the row right away.
          // Nothing is visible to customers until the admin confirms in the review step.
          isActive: false,
          price: Number(price.trim()),
          currency: DEFAULT_CURRENCY_CODE,
          categoryId: categoryId.trim() || undefined,
          brandId: brandId.trim() || undefined,
          extractDescription,
          stockQuantity: Number(stockQuantity.trim() || '0'),
          minimalStock: Number(minimalStock.trim() || '0'),
        },
        {
          signal: controller.signal,
          onUploadProgress: (progress) => {
            if (progress.loaded > 0) {
              hasUploadStartedRef.current = true;
            }
          },
        },
      );

      setCreatedProduct(result.product);
      setPhotoImport(result.photoImport);
      setReviewDescription(result.product.description ?? '');
      setPhase('review');
    } catch (error) {
      applyRequestError(error);
    } finally {
      isRequestInFlightRef.current = false;
      abortControllerRef.current = null;
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isRequestInFlightRef.current) {
      return;
    }

    setGeneralError(null);
    setIsRetryable(false);

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    void submitPhotoImport();
  }

  function handleAbortUpload() {
    abortControllerRef.current?.abort();

    if (!hasUploadStartedRef.current) {
      setPhase('form');
      setGeneralError(t('products.photoImport.errors.cancelled'));
    }
  }

  async function handleSaveReview(activate: boolean) {
    if (!createdProduct || isSaving) {
      return;
    }

    const normalizedDescription = reviewDescription.trim();

    if (activate && normalizedDescription.length === 0) {
      setFieldErrors({
        description: t('products.photoImport.errors.descriptionRequiredToActivate'),
      });
      descriptionRef.current?.focus();
      return;
    }

    setIsSaving(true);
    setFieldErrors({});
    setGeneralError(null);

    try {
      const patched = await services.products.patchProduct(createdProduct.id, {
        description: normalizedDescription,
        ...(activate ? { isActive: true } : {}),
      });

      if (!patched) {
        throw new Error(t('products.photoImport.errors.saveFailed'));
      }

      setCreatedProduct(patched);
      setSavedAsActive(activate);
      onProductsChanged();
      setPhase('saved');
    } catch (error) {
      const details = extractApiErrorDetails(error);

      if (details.statusCode === 401 || details.statusCode === 403) {
        setGeneralError(
          details.statusCode === 401
            ? t('products.photoImport.errors.unauthorized')
            : t('products.photoImport.errors.forbidden'),
        );
      } else if (Object.keys(details.fieldErrors).length > 0) {
        setFieldErrors(details.fieldErrors);
        setGeneralError(details.generalMessage);
      } else {
        setGeneralError(
          details.generalMessage ?? t('products.photoImport.errors.saveFailed'),
        );
      }
    } finally {
      setIsSaving(false);
    }
  }

  function handleAddAnother() {
    // Category, brand and the stock defaults stay so products can be added back to back.
    setName('');
    setPrice('');
    resetImage();
    setCreatedProduct(null);
    setPhotoImport(null);
    setReviewDescription('');
    setFieldErrors({});
    setGeneralError(null);
    setIsRetryable(false);
    setSavedAsActive(false);
    setPhase('form');
  }

  function handleCheckProductList() {
    onProductsChanged();
    onClose();
  }

  const currentStageIndex = resolveStageIndex(elapsedMs);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const processedImageUrl =
    createdProduct?.images[0]?.imageUrl ?? createdProduct?.imageUrl ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-background-overlay/72 backdrop-blur-[3px]"
      onClick={requestClose}
      role="presentation"
    >
      <aside
        className="h-full w-full overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:max-w-[560px] min-[641px]:p-5"
        onClick={(event) => event.stopPropagation()}
        aria-label={t('products.photoImport.title')}
      >
        <header className="mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t('products.photoImport.eyebrow')}
              </p>
              <h2 className="mt-1 font-display text-[1.45rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-text-primary">
                {t('products.photoImport.title')}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {phase === 'review' || phase === 'saved'
                  ? t('products.photoImport.reviewSubtitle')
                  : t('products.photoImport.subtitle')}
              </p>
            </div>

            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary shadow-sm transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-60"
              onClick={requestClose}
              disabled={isBusy}
              aria-label={t('products.photoImport.close')}
            >
              <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>
        </header>

        {phase === 'form' ? (
          <form className="grid gap-3" onSubmit={handleSubmit} noValidate>
            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="photo-import-name">
                {t('products.photoImport.name')}
              </label>
              <input
                id="photo-import-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={inputClassName}
                placeholder={t('products.photoImport.namePlaceholder')}
                aria-invalid={Boolean(fieldErrors.name)}
                required
              />
              {fieldErrors.name ? (
                <p className={fieldErrorClassName}>{fieldErrors.name}</p>
              ) : null}
            </div>

            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="photo-import-image">
                {t('products.photoImport.image')}
              </label>
              <div className="grid gap-3 rounded-lg border border-dashed border-border-soft/70 bg-surface-card p-3">
                <input
                  ref={fileInputRef}
                  id="photo-import-image"
                  type="file"
                  accept={PRODUCT_PHOTO_IMPORT_ACCEPT_ATTRIBUTE}
                  capture="environment"
                  onChange={handleImageChange}
                  className="block w-full cursor-pointer text-sm text-text-secondary file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary/12 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-text-accent hover:file:bg-primary/16"
                  aria-invalid={Boolean(fieldErrors.image)}
                />

                <p className="m-0 inline-flex items-center gap-1.5 text-[12px] text-text-muted">
                  <FiCamera className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {t('products.photoImport.imageHint', {
                    limit: PRODUCT_PHOTO_IMPORT_MAX_FILE_SIZE_LABEL,
                  })}
                </p>

                {imageFile ? (
                  <div className="flex items-start gap-3">
                    {previewUrl && isPreviewRenderable ? (
                      <img
                        src={previewUrl}
                        alt={t('products.photoImport.previewAlt')}
                        className="h-24 w-24 shrink-0 rounded-lg object-cover ring-1 ring-border-soft/45"
                        onError={() => setIsPreviewRenderable(false)}
                      />
                    ) : (
                      <span className="inline-flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-lg bg-surface-subtle px-2 text-center text-[10px] font-medium text-text-muted ring-1 ring-border-soft/45">
                        <FiImage className="h-4 w-4" aria-hidden="true" />
                        {t('products.photoImport.previewUnsupported')}
                      </span>
                    )}

                    <div className="grid min-w-0 gap-1">
                      <span className="truncate text-sm font-semibold text-text-primary">
                        {imageFile.name}
                      </span>
                      <span className="text-[12px] text-text-secondary">
                        {(imageFile.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                      <button
                        type="button"
                        className="justify-self-start text-[12px] font-semibold text-danger hover:underline"
                        onClick={resetImage}
                      >
                        {t('products.photoImport.removeImage')}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              {fieldErrors.image ? (
                <p className={fieldErrorClassName}>{fieldErrors.image}</p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label className={labelClassName}>
                  {t('products.photoImport.category')}
                </label>
                <FilterSelect
                  value={categoryId}
                  options={categorySelectOptions}
                  onChange={setCategoryId}
                  disabled={isCategoryOptionsLoading}
                />
                {fieldErrors.categoryId ? (
                  <p className={fieldErrorClassName}>{fieldErrors.categoryId}</p>
                ) : null}
              </div>

              <div className="grid gap-1.5">
                <label className={labelClassName}>
                  {t('products.photoImport.brand')}
                </label>
                <FilterSelect
                  value={brandId}
                  options={brandSelectOptions}
                  onChange={setBrandId}
                  disabled={isBrandOptionsLoading}
                />
                {fieldErrors.brandId ? (
                  <p className={fieldErrorClassName}>{fieldErrors.brandId}</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <label className={labelClassName} htmlFor="photo-import-price">
                  {t('products.photoImport.price')}
                </label>
                <input
                  id="photo-import-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  className={inputClassName}
                  placeholder="0.00"
                  aria-invalid={Boolean(fieldErrors.price)}
                  required
                />
                {fieldErrors.price ? (
                  <p className={fieldErrorClassName}>{fieldErrors.price}</p>
                ) : null}
              </div>

              <div className="grid gap-1.5">
                <label className={labelClassName} htmlFor="photo-import-stock">
                  {t('products.photoImport.stockQuantity')}
                </label>
                <input
                  id="photo-import-stock"
                  type="number"
                  min="0"
                  step="1"
                  value={stockQuantity}
                  onChange={(event) => setStockQuantity(event.target.value)}
                  className={inputClassName}
                  placeholder="0"
                />
                {fieldErrors.stockQuantity ? (
                  <p className={fieldErrorClassName}>{fieldErrors.stockQuantity}</p>
                ) : null}
              </div>

              <div className="grid gap-1.5">
                <label className={labelClassName} htmlFor="photo-import-minimal-stock">
                  {t('products.photoImport.minimalStock')}
                </label>
                <input
                  id="photo-import-minimal-stock"
                  type="number"
                  min="0"
                  step="1"
                  value={minimalStock}
                  onChange={(event) => setMinimalStock(event.target.value)}
                  className={inputClassName}
                  placeholder="0"
                />
                {fieldErrors.minimalStock ? (
                  <p className={fieldErrorClassName}>{fieldErrors.minimalStock}</p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-card px-4 py-4 ring-1 ring-border-soft/35">
              <div className="grid gap-0.5">
                <p className="m-0 text-sm font-semibold text-text-primary">
                  {t('products.photoImport.extractDescription')}
                </p>
                <p className="m-0 text-[12px] text-text-secondary">
                  {t('products.photoImport.extractDescriptionHint')}
                </p>
              </div>
              <Switch checked={extractDescription} onChange={setExtractDescription} />
            </div>

            <p className="m-0 rounded-lg bg-surface-subtle/80 px-3 py-2 text-[12px] leading-5 text-text-secondary">
              {t('products.photoImport.draftNotice')}
            </p>

            {generalError ? (
              <div className="grid gap-2 rounded-lg bg-danger-bg px-3 py-2">
                <p className="m-0 text-sm font-medium text-danger">{generalError}</p>
                {isRetryable ? (
                  <button
                    type="submit"
                    className="justify-self-start text-[12px] font-semibold text-danger hover:underline"
                  >
                    {t('products.photoImport.retry')}
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <button type="submit" className={primaryButtonClassName}>
                <AppIcon name="plus" className="h-4 w-4" aria-hidden="true" />
                {t('products.photoImport.submit')}
              </button>
              <button
                type="button"
                className={secondaryButtonClassName}
                onClick={onClose}
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        ) : null}

        {phase === 'uploading' ? (
          <section
            className="grid gap-3 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40"
            aria-live="polite"
          >
            <p className="m-0 text-sm font-semibold text-text-primary">
              {t('products.photoImport.processingTitle')}
            </p>

            <ol className="m-0 grid list-none gap-2 p-0">
              {PHOTO_IMPORT_STAGES.map((stage, index) => {
                const isDone = index < currentStageIndex;
                const isCurrent = index === currentStageIndex;

                return (
                  <li
                    key={stage}
                    className={[
                      'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium ring-1',
                      isCurrent
                        ? 'bg-primary/10 text-text-primary ring-primary/25'
                        : isDone
                          ? 'bg-surface-subtle/70 text-text-secondary ring-border-soft/35'
                          : 'bg-surface-subtle/40 text-text-muted ring-border-soft/25',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                        isDone
                          ? 'bg-success-bg text-success'
                          : isCurrent
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-surface-muted text-text-muted',
                      ].join(' ')}
                    >
                      {isDone ? (
                        <FiCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    {t(`products.photoImport.stages.${stage}`)}
                  </li>
                );
              })}
            </ol>

            <p className="m-0 text-[12px] text-text-secondary">
              {t('products.photoImport.processingHint', { seconds: elapsedSeconds })}
            </p>

            <button
              type="button"
              className={`${secondaryButtonClassName} justify-self-start`}
              onClick={handleAbortUpload}
            >
              {t('products.photoImport.abort')}
            </button>
          </section>
        ) : null}

        {phase === 'unknown-result' ? (
          <section className="grid gap-3 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40">
            <p className="m-0 inline-flex items-center gap-2 text-sm font-semibold text-warning">
              <FiAlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t('products.photoImport.unknownResultTitle')}
            </p>
            <p className="m-0 text-sm leading-6 text-text-secondary">
              {t('products.photoImport.unknownResultDescription')}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={primaryButtonClassName}
                onClick={handleCheckProductList}
              >
                {t('products.photoImport.openProductList')}
              </button>
              <button
                type="button"
                className={secondaryButtonClassName}
                onClick={onClose}
              >
                {t('common.close', { defaultValue: 'Yopish' })}
              </button>
            </div>
          </section>
        ) : null}

        {phase === 'review' && createdProduct ? (
          <section className="grid gap-3">
            <div className="grid gap-2 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40">
              <p className="m-0 text-sm font-semibold text-text-primary">
                {t('products.photoImport.processedImage')}
              </p>
              {processedImageUrl ? (
                <img
                  src={processedImageUrl}
                  alt={createdProduct.name}
                  className="mx-auto w-full max-w-[360px] rounded-xl bg-white object-contain ring-1 ring-border-soft/45"
                />
              ) : (
                <p className="m-0 rounded-lg bg-surface-subtle/80 px-3 py-2 text-sm text-text-secondary">
                  {t('products.photoImport.noProcessedImage')}
                </p>
              )}
            </div>

            {photoImport?.backgroundRemoved === false ? (
              <p className="m-0 inline-flex items-start gap-2 rounded-lg bg-warning-bg/60 px-3 py-2 text-sm font-medium text-warning">
                <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {t('products.photoImport.notices.backgroundNotRemoved')}
              </p>
            ) : null}

            {needsManualDescription ? (
              <p className="m-0 inline-flex items-start gap-2 rounded-lg bg-warning-bg/60 px-3 py-2 text-sm font-medium text-warning">
                <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {t('products.photoImport.notices.noOcrText')}
              </p>
            ) : null}

            <div className="grid gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  className={labelClassName}
                  htmlFor="photo-import-review-description"
                >
                  {t('products.photoImport.description')}
                </label>
                <button
                  type="button"
                  className="text-[12px] font-semibold text-text-accent hover:underline disabled:opacity-60"
                  onClick={() => {
                    setReviewDescription('');
                    descriptionRef.current?.focus();
                  }}
                  disabled={isSaving || reviewDescription.length === 0}
                >
                  {t('products.photoImport.clearDescription')}
                </button>
              </div>
              <textarea
                ref={descriptionRef}
                id="photo-import-review-description"
                value={reviewDescription}
                onChange={(event) => setReviewDescription(event.target.value)}
                className={`${inputClassName} min-h-[140px] resize-y`}
                placeholder={t('products.photoImport.descriptionPlaceholder')}
                disabled={isSaving}
                aria-invalid={Boolean(fieldErrors.description)}
              />
              {fieldErrors.description ? (
                <p className={fieldErrorClassName}>{fieldErrors.description}</p>
              ) : null}
            </div>

            <p className="m-0 rounded-lg bg-surface-subtle/80 px-3 py-2 text-[12px] leading-5 text-text-secondary">
              {t('products.photoImport.reviewDraftNotice')}
            </p>

            {generalError ? (
              <p className="m-0 rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
                {generalError}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={primaryButtonClassName}
                onClick={() => {
                  void handleSaveReview(true);
                }}
                disabled={isSaving}
              >
                {isSaving
                  ? t('products.photoImport.saving')
                  : t('products.photoImport.saveAndActivate')}
              </button>
              <button
                type="button"
                className={secondaryButtonClassName}
                onClick={() => {
                  void handleSaveReview(false);
                }}
                disabled={isSaving}
              >
                {t('products.photoImport.keepDraft')}
              </button>
            </div>
          </section>
        ) : null}

        {phase === 'saved' && createdProduct ? (
          <section className="grid gap-3 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40">
            <p className="m-0 inline-flex items-center gap-2 text-sm font-semibold text-success">
              <FiCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              {savedAsActive
                ? t('products.photoImport.savedActive', { name: createdProduct.name })
                : t('products.photoImport.savedDraft', { name: createdProduct.name })}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={primaryButtonClassName}
                onClick={handleAddAnother}
              >
                <AppIcon name="plus" className="h-4 w-4" aria-hidden="true" />
                {t('products.photoImport.addAnother')}
              </button>
              <button
                type="button"
                className={secondaryButtonClassName}
                onClick={onClose}
              >
                {t('common.close', { defaultValue: 'Yopish' })}
              </button>
            </div>
          </section>
        ) : null}
      </aside>
    </div>
  );
}

export default ProductPhotoImportPanel;
