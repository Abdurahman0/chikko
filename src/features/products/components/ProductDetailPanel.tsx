import { useEffect, useState } from 'react';
import { FiEdit2, FiImage, FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '../../../components/shared/data';
import AppIcon from '../../../components/shared/icons/AppIcon';
import { EmptyState, LoadingState, PageCard } from '../../../components/shared/page';
import { formatCurrencyAmount } from '../../../constants';
import { formatLocalizedDate } from '../../../i18n/date-format';
import { services } from '../../../services';
import type { EntityId, Product } from '../../../types/domain';

interface ProductDetailPanelProps {
  productId: EntityId;
  onClose: () => void;
  onProductChanged?: () => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  isDeleteDisabled?: boolean;
  deleteDisabledReason?: string | null;
}

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

const valueClassName =
  'text-sm font-semibold text-text-primary [overflow-wrap:anywhere]';

function formatDateTime(
  timestamp: string | undefined,
  language: string,
  locale: string,
): string {
  return formatLocalizedDate(timestamp, language, {
    locale,
    withYear: true,
    withTime: true,
    shortMonth: true,
    fallback: '',
  });
}

function ProductDetailPanel({
  productId,
  onClose,
  onProductChanged,
  onEdit,
  onDelete,
  isDeleteDisabled = false,
  deleteDisabledReason = null,
}: ProductDetailPanelProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadProduct() {
      setIsLoading(true);
      setHasError(false);

      try {
        const nextProduct = await services.products.getById(productId);
        if (!isActive) {
          return;
        }

        setProduct(nextProduct);
      } catch {
        if (!isActive) {
          return;
        }

        setHasError(true);
        setProduct(null);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadProduct();

    return () => {
      isActive = false;
    };
  }, [productId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (previewImageUrl) {
          setPreviewImageUrl(null);
          return;
        }

        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, previewImageUrl]);

  async function handleDeleteImage(imageId: string) {
    if (!product || deletingImageId) {
      return;
    }

    setDeletingImageId(imageId);

    try {
      const deleted = await services.products.deleteProductImage(product.id, imageId);
      if (!deleted) {
        return;
      }

      setProduct((current) => {
        if (!current) {
          return current;
        }

        const nextImages = current.images.filter((image) => image.id !== imageId);
        return {
          ...current,
          images: nextImages,
          imageUrl: nextImages[0]?.imageUrl,
        };
      });
      onProductChanged?.();
    } catch {
      // Keep current state if image deletion fails.
    } finally {
      setDeletingImageId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-background-overlay/72 backdrop-blur-[3px]"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="h-full w-full overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:max-w-[460px] min-[641px]:p-5"
        onClick={(event) => event.stopPropagation()}
        aria-label={t('products.detail.titleFallback')}
      >
        <header className="mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40 transition duration-base hover:shadow-md hover:ring-border-soft/60">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t('products.detail.eyebrow')}
              </p>
              <h2 className="mt-1 font-display text-[1.45rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-text-primary [overflow-wrap:anywhere]">
                {product?.name ?? t('products.detail.titleFallback')}
              </h2>
              {!isLoading && product ? (
                <p className="mt-1 text-sm text-text-secondary [overflow-wrap:anywhere]">
                  {t('products.detail.skuPrefix')}: {product.sku ?? t('common.na')}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary shadow-sm transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              onClick={onClose}
              aria-label={t('products.detail.close')}
            >
              <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>

          {!isLoading && product ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge
                status={product.isActive ? 'active' : 'inactive'}
                label={product.isActive ? t('common.active') : t('common.inactive')}
                tone={product.isActive ? 'success' : 'neutral'}
              />
              <span className="inline-flex min-h-7 items-center rounded-pill bg-surface-subtle px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
                {product.currency}
              </span>
            </div>
          ) : null}
        </header>

        <div className="grid gap-3">
          {isLoading ? (
            <LoadingState
              title={t('products.detail.loadingTitle')}
              description={t('products.detail.loadingDescription')}
            />
          ) : null}

          {!isLoading && (hasError || !product) ? (
            <EmptyState
              title={t('products.detail.errorTitle')}
              description={t('products.detail.errorDescription')}
            />
          ) : null}

          {!isLoading && product ? (
            <>
              <PageCard>
                <div className="grid gap-4">
                  <div className="grid gap-1">
                    <h3 className="m-0 text-[1rem] font-semibold text-text-primary">
                      {t('products.detail.images')}
                    </h3>
                    <p className="m-0 text-sm text-text-secondary">
                      {t('products.detail.imagesDesc')}
                    </p>
                  </div>

                  {product.images.length ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {product.images.slice(0, 3).map((image) => (
                        <div
                          key={image.id}
                          className="relative aspect-square overflow-hidden rounded-md bg-surface-subtle/70 ring-1 ring-border-soft/45"
                        >
                          <button
                            type="button"
                            className="h-full w-full cursor-zoom-in"
                            onClick={() => setPreviewImageUrl(image.imageUrl)}
                            aria-label={product.name}
                          >
                            <img
                              src={image.imageUrl}
                              alt={product.name}
                              className="h-full w-full object-cover transition duration-fast hover:scale-[1.01]"
                              loading="lazy"
                            />
                          </button>
                          <button
                            type="button"
                            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md bg-background-subtle/90 text-danger transition duration-fast hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => {
                              void handleDeleteImage(image.id);
                            }}
                            disabled={deletingImageId === image.id}
                            aria-label={t('products.detail.deleteImage')}
                            title={t('products.detail.deleteImage')}
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg bg-surface-subtle/80 px-3 py-3 text-sm font-medium text-text-secondary">
                      <FiImage className="h-4 w-4" />
                      {t('products.detail.noImages')}
                    </div>
                  )}
                </div>
              </PageCard>

              <PageCard>
                <div className="grid gap-4">
                  <div className="grid gap-1">
                    <h3 className="m-0 text-[1rem] font-semibold text-text-primary">
                      {t('products.detail.sectionDetails')}
                    </h3>
                    <p className="m-0 text-sm text-text-secondary">
                      {t('products.detail.sectionDetailsDesc')}
                    </p>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div className="rounded-lg bg-surface-subtle/80 p-3">
                      <p className={labelClassName}>
                        {t('products.detail.price')}
                      </p>
                      <p className={`mt-1 ${valueClassName}`}>
                        {formatCurrencyAmount(product.price, locale)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/80 p-3">
                      <p className={labelClassName}>
                        {t('products.detail.stockQuantity')}
                      </p>
                      <p className={`mt-1 ${valueClassName}`}>
                        {product.stockQuantity ?? 0}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/80 p-3">
                      <p className={labelClassName}>
                        {t('products.form.category')}
                      </p>
                      <p className={`mt-1 ${valueClassName}`}>
                        {product.categoryName || product.category?.name || t('common.na')}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/80 p-3">
                      <p className={labelClassName}>
                        {t('products.form.brand', { defaultValue: 'Brend' })}
                      </p>
                      <p className={`mt-1 ${valueClassName}`}>
                        {product.brandName || product.brand?.name || t('common.na')}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/80 p-3">
                      <p className={labelClassName}>
                        {t('products.detail.reviewsEnabled', {
                          defaultValue: 'Sharhlar',
                        })}
                      </p>
                      <p className={`mt-1 ${valueClassName}`}>
                        {product.reviewsEnabled ? t('common.active') : t('common.inactive')}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/80 p-3 sm:col-span-2">
                      <p className={labelClassName}>
                        {t('products.detail.description')}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-text-secondary [overflow-wrap:anywhere]">
                        {product.description || t('products.detail.noDescription')}
                      </p>
                    </div>
                  </div>
                </div>
              </PageCard>

              <PageCard>
                <div className="grid gap-4">
                  <div className="grid gap-1">
                    <h3 className="m-0 text-[1rem] font-semibold text-text-primary">
                      {t('products.detail.sectionLifecycle')}
                    </h3>
                    <p className="m-0 text-sm text-text-secondary">
                      {t('products.detail.sectionLifecycleDesc')}
                    </p>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div className="rounded-lg bg-surface-subtle/35 p-3 ring-1 ring-border-soft/20">
                      <p className={labelClassName}>
                        {t('products.detail.created')}
                      </p>
                      <p className={`mt-1 ${valueClassName}`}>
                        {formatDateTime(product.createdAt, i18n.language, locale) || t('common.na')}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/35 p-3 ring-1 ring-border-soft/20">
                      <p className={labelClassName}>
                        {t('products.detail.updated')}
                      </p>
                      <p className={`mt-1 ${valueClassName}`}>
                        {formatDateTime(product.updatedAt, i18n.language, locale) || t('common.na')}
                      </p>
                    </div>
                  </div>
                </div>
              </PageCard>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                  onClick={() => onEdit(product)}
                >
                  <FiEdit2 className="h-4 w-4" />
                  {t('products.detail.editProduct')}
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-surface-card px-4 text-sm font-semibold text-danger shadow-sm ring-1 ring-danger/25 transition duration-fast hover:bg-danger/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/25 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => onDelete(product)}
                  disabled={isDeleteDisabled}
                  title={deleteDisabledReason ?? undefined}
                >
                  <FiTrash2 className="h-4 w-4" />
                  {t('products.detail.deleteProduct')}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </aside>

      {previewImageUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 transition duration-base animate-in fade-in"
          onClick={() => setPreviewImageUrl(null)}
        >
          <img
            src={previewImageUrl}
            alt="Mahsulot rasmi"
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl transition duration-base animate-in zoom-in-95"
          />
          <button
            type="button"
            className="absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-md transition duration-fast hover:bg-white/20"
            onClick={() => setPreviewImageUrl(null)}
          >
            <AppIcon name="close" className="h-5 w-5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default ProductDetailPanel;
