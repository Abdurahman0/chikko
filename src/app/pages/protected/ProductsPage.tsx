import { useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiImage, FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { DEFAULT_CURRENCY_CODE, formatCurrencyAmount } from '../../../constants';
import {
  DataTable,
  FilterBar,
  FilterSelect,
  Pagination,
  SearchInput,
  StatusBadge,
  type DataTableColumn,
} from '../../../components/shared/data';
import AppIcon from '../../../components/shared/icons/AppIcon';
import {
  EmptyState,
  LoadingState,
  PageCard,
  PageHeader,
  PageLayout,
  PageSection,
} from '../../../components/shared/page';
import ProductDeleteDialog from '../../../features/products/components/ProductDeleteDialog';
import ProductDetailPanel from '../../../features/products/components/ProductDetailPanel';
import ProductFormPanel from '../../../features/products/components/ProductFormPanel';
import { services } from '../../../services';
import type {
  PaginationMeta,
  Product,
  ProductMutationInput,
  SelectOption,
  TableQueryParams,
} from '../../../types/domain';

type ActiveFilter = 'all' | 'active' | 'inactive';
type ProductOrdering =
  | '-created_at'
  | 'created_at'
  | 'name'
  | '-name'
  | 'price'
  | '-price';

const PAGE_SIZE = 8;
const SERVICE_FETCH_SIZE = 500;
const ALL_CURRENCIES_VALUE = 'all';
const DEFAULT_ORDERING: ProductOrdering = '-created_at';

const DEFAULT_PAGINATION_META: PaginationMeta = {
  page: 1,
  pageSize: PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
};

const tablePrimaryTextClassName =
  'block max-w-[140px] truncate text-sm font-semibold leading-[1.35] text-text-primary min-[640px]:max-w-[220px]';

const tableSecondaryTextClassName =
  'block max-w-[140px] truncate text-[12px] leading-[1.45] text-text-secondary min-[640px]:max-w-[220px]';

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

const actionButtonClassName =
  'inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface-card text-text-secondary shadow-sm ring-1 ring-border-soft/40 transition duration-fast hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20';

function parseOrdering(ordering: ProductOrdering): Pick<
  TableQueryParams,
  'sortBy' | 'sortDirection'
> {
  const direction = ordering.startsWith('-') ? 'desc' : 'asc';
  const sortBy = ordering.replace('-', '');

  return {
    sortBy,
    sortDirection: direction,
  };
}

function ProductsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';

  const activeFilterOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'all', label: t('products.allStatuses') },
      { value: 'active', label: t('common.active') },
      { value: 'inactive', label: t('common.inactive') },
    ],
    [t],
  );

  const orderingOptions = useMemo<SelectOption[]>(
    () => [
      { value: '-created_at', label: t('products.createdNewest') },
      { value: 'created_at', label: t('products.createdOldest') },
      { value: 'name', label: t('products.nameAz') },
      { value: '-name', label: t('products.nameZa') },
      { value: '-price', label: t('products.priceHighLow') },
      { value: 'price', label: t('products.priceLowHigh') },
    ],
    [t],
  );

  const [search, setSearch] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState(ALL_CURRENCIES_VALUE);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [ordering, setOrdering] = useState<ProductOrdering>(DEFAULT_ORDERING);
  const [currentPage, setCurrentPage] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>(
    DEFAULT_PAGINATION_META,
  );
  const [currencyOptions, setCurrencyOptions] = useState<SelectOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [reloadCursor, setReloadCursor] = useState(0);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);

  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const currencyAllOption = useMemo<SelectOption>(
    () => ({
      value: ALL_CURRENCIES_VALUE,
      label: t('products.allCurrencies'),
    }),
    [t],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, currencyFilter, activeFilter, ordering]);

  useEffect(() => {
    let isActive = true;

    async function loadCurrencyOptions() {
      try {
        const result = await services.products.list({
          page: 1,
          pageSize: SERVICE_FETCH_SIZE,
          ordering: 'name',
        });

        if (!isActive) {
          return;
        }

        const distinct = Array.from(new Set(result.items.map((item) => item.currency)))
          .sort((left, right) => left.localeCompare(right))
          .map((currency) => ({ value: currency, label: currency }));
        setCurrencyOptions([currencyAllOption, ...distinct]);
      } catch {
        if (!isActive) {
          return;
        }

        setCurrencyOptions([currencyAllOption]);
      }
    }

    void loadCurrencyOptions();

    return () => {
      isActive = false;
    };
  }, [currencyAllOption, reloadCursor]);

  useEffect(() => {
    let isActive = true;

    async function loadProducts() {
      setIsLoading(true);
      setHasError(false);

      try {
        const sortConfig = parseOrdering(ordering);
        const result = await services.products.list({
          page: currentPage,
          pageSize: PAGE_SIZE,
          search,
          currency:
            currencyFilter === ALL_CURRENCIES_VALUE ? undefined : currencyFilter,
          is_active:
            activeFilter === 'all' ? undefined : activeFilter === 'active',
          ordering,
          ...sortConfig,
        });

        if (!isActive) {
          return;
        }

        if (currentPage > result.meta.totalPages) {
          setCurrentPage(result.meta.totalPages);
          return;
        }

        setProducts(result.items);
        setPaginationMeta(result.meta);
      } catch {
        if (!isActive) {
          return;
        }

        setHasError(true);
        setProducts([]);
        setPaginationMeta(DEFAULT_PAGINATION_META);
      } finally {
        if (isActive) {
          setHasLoadedOnce(true);
          setIsLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      isActive = false;
    };
  }, [activeFilter, currencyFilter, currentPage, ordering, reloadCursor, search]);

  useEffect(() => {
    if (!selectedProductId) {
      return;
    }

    const selectedVisible = products.some((product) => product.id === selectedProductId);
    if (!selectedVisible) {
      setSelectedProductId(null);
    }
  }, [products, selectedProductId]);

  function openCreateForm() {
    setFormMode('create');
    setEditingProduct(null);
    setFormErrorMessage(null);
    setIsFormOpen(true);
  }

  function openEditForm(product: Product) {
    setFormMode('edit');
    setEditingProduct(product);
    setFormErrorMessage(null);
    setIsFormOpen(true);
  }

  function requestDelete(product: Product) {
    setProductToDelete(product);
  }

  async function handleSaveProduct(
    payload: ProductMutationInput,
    options: {
      newImages: File[];
      deletedImageIds: string[];
    },
  ) {
    setIsSaving(true);
    setFormErrorMessage(null);

    try {
      let targetProductId: string;

      if (formMode === 'create') {
        const created = await services.products.createProduct(payload);
        targetProductId = created.id;
      } else {
        const editId = editingProduct?.id;
        if (!editId) {
          throw new Error(t('products.form.saveError'));
        }

        const updated = await services.products.updateProduct(editId, payload);
        if (!updated) {
          throw new Error(t('products.form.saveError'));
        }

        targetProductId = editId;

        if (options.deletedImageIds.length) {
          await Promise.all(
            options.deletedImageIds.map((imageId) =>
              services.products.deleteProductImage(editId, imageId),
            ),
          );
        }
      }

      if (options.newImages.length) {
        const uploaded = await services.products.uploadProductImages(
          targetProductId,
          options.newImages,
        );
        if (!uploaded) {
          throw new Error(t('products.form.saveError'));
        }
      }

      setIsFormOpen(false);
      setEditingProduct(null);
      setReloadCursor((current) => current + 1);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('products.form.saveError');
      setFormErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!productToDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      const deleted = await services.products.delete(productToDelete.id);
      if (!deleted) {
        throw new Error();
      }

      if (selectedProductId === productToDelete.id) {
        setSelectedProductId(null);
      }

      setProductToDelete(null);
      setReloadCursor((current) => current + 1);
    } catch {
      // Keep dialog open if deletion fails.
    } finally {
      setIsDeleting(false);
    }
  }

  const columns = useMemo<DataTableColumn<Product>[]>(() => {
    return [
      {
        key: 'product',
        label: t('products.columns.product'),
        render: (product) => (
          <div className="flex items-center gap-2.5">
            {product.images[0]?.imageUrl || product.imageUrl ? (
              <img
                src={product.images[0]?.imageUrl ?? product.imageUrl}
                alt={product.name}
                className="h-10 w-10 shrink-0 rounded-md object-cover ring-1 ring-border-soft/45"
                loading="lazy"
              />
            ) : (
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-subtle text-text-muted ring-1 ring-border-soft/45">
                <FiImage className="h-4 w-4" />
              </span>
            )}
            <div className="grid gap-0.5">
              <span className={tablePrimaryTextClassName}>{product.name}</span>
              <span className={tableSecondaryTextClassName}>
                {product.description || t('products.noDescription')}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'sku',
        label: t('products.columns.sku'),
        render: (product) => (
          <span className={tablePrimaryTextClassName}>{product.sku ?? t('common.na')}</span>
        ),
      },
      {
        key: 'price',
        label: t('products.columns.price'),
        render: (product) => (
          <span className={tablePrimaryTextClassName}>
            {formatCurrencyAmount(product.price, locale)}
          </span>
        ),
      },
      {
        key: 'currency',
        label: t('products.columns.currency'),
        render: (product) => (
          <span className={tablePrimaryTextClassName}>{product.currency}</span>
        ),
      },
      {
        key: 'stock',
        label: t('products.columns.stock'),
        render: (product) => (
          <span className={tablePrimaryTextClassName}>{product.stockQuantity ?? 0}</span>
        ),
      },
      {
        key: 'status',
        label: t('products.columns.status'),
        render: (product) => (
          <StatusBadge
            status={product.isActive ? 'active' : 'inactive'}
            label={product.isActive ? t('common.active') : t('common.inactive')}
            tone={product.isActive ? 'success' : 'neutral'}
          />
        ),
      },
      {
        key: 'updatedAt',
        label: t('products.columns.updated'),
        render: (product) => (
          <span className={tablePrimaryTextClassName}>
            {product.updatedAt
              ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
                  new Date(product.updatedAt),
                )
              : t('common.na')}
          </span>
        ),
      },
      {
        key: 'actions',
        label: t('products.columns.actions'),
        align: 'right',
        render: (product) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              className={actionButtonClassName}
              onClick={(event) => {
                event.stopPropagation();
                openEditForm(product);
              }}
              aria-label={`${t('products.actions.edit')} ${product.name}`}
            >
              <FiEdit2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className={actionButtonClassName}
              onClick={(event) => {
                event.stopPropagation();
                requestDelete(product);
              }}
              aria-label={`${t('products.actions.delete')} ${product.name}`}
            >
              <FiTrash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      },
    ];
  }, [locale, t]);

  const activeFilterCount =
    Number(currencyFilter !== ALL_CURRENCIES_VALUE) +
    Number(activeFilter !== 'all') +
    Number(ordering !== DEFAULT_ORDERING);

  const formCurrencyOptions = useMemo<SelectOption[]>(() => {
    const filtered = currencyOptions.filter(
      (option) => option.value !== ALL_CURRENCIES_VALUE,
    );

    return filtered.length > 0
      ? filtered
      : [{ value: DEFAULT_CURRENCY_CODE, label: DEFAULT_CURRENCY_CODE }];
  }, [currencyOptions]);

  const header = (
    <PageHeader
      eyebrow={t('products.title')}
      title={t('products.title')}
      subtitle={t('products.subtitle')}
      actions={
        <div className="flex w-full flex-wrap items-center gap-2 min-[768px]:w-auto">
          <button
            type="button"
            className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            onClick={openCreateForm}
          >
            <AppIcon name="plus" className="h-4 w-4" aria-hidden="true" />
            {t('products.newProduct')}
          </button>
          <span className="inline-flex min-h-8 items-center gap-2 rounded-pill bg-primary/12 px-3 text-[12px] font-semibold text-text-accent">
            <AppIcon name="products" className="h-3.5 w-3.5" aria-hidden="true" />
            {paginationMeta.totalItems} {t('products.title').toLowerCase()}
          </span>
        </div>
      }
    />
  );

  if (!hasLoadedOnce && isLoading) {
    return (
      <PageLayout header={header}>
        <PageSection>
          <PageCard>
            <LoadingState
              title={t('products.loadingTitle')}
              description={t('products.loadingDescription')}
            />
          </PageCard>
        </PageSection>
      </PageLayout>
    );
  }

  if (hasError) {
    return (
      <PageLayout header={header}>
        <PageSection>
          <PageCard>
            <EmptyState
              title={t('products.errorTitle')}
              description={t('products.errorDescription')}
            />
          </PageCard>
        </PageSection>
      </PageLayout>
    );
  }

  return (
    <PageLayout header={header}>
      <PageSection>
        <FilterBar
          actions={
            <div className="flex w-full flex-wrap items-center gap-2 max-[820px]:justify-start min-[820px]:w-auto">
              <span className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-surface-subtle px-3 text-sm font-semibold text-text-primary">
                <AppIcon
                  name="activity"
                  className="h-4 w-4 text-text-muted"
                  aria-hidden="true"
                />
                {paginationMeta.totalItems} {t('products.records')}
              </span>
              {activeFilterCount > 0 ? (
                <span className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary/12 px-3 text-sm font-semibold text-text-accent">
                  <AppIcon name="filter" className="h-4 w-4" aria-hidden="true" />
                  {activeFilterCount} {t('products.activeFilters')}
                </span>
              ) : null}
            </div>
          }
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t('products.searchPlaceholder')}
            disabled={isLoading}
          />

          <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_180px]">
            <span className={labelClassName}>{t('products.currency')}</span>
            <FilterSelect
              value={currencyFilter}
              options={currencyOptions}
              onChange={setCurrencyFilter}
              disabled={isLoading}
            />
          </label>

          <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_180px]">
            <span className={labelClassName}>{t('products.status')}</span>
            <FilterSelect
              value={activeFilter}
              options={activeFilterOptions}
              onChange={(value) => setActiveFilter(value as ActiveFilter)}
              disabled={isLoading}
            />
          </label>

          <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_200px]">
            <span className={labelClassName}>{t('products.orderBy')}</span>
            <FilterSelect
              value={ordering}
              options={orderingOptions}
              onChange={(value) => setOrdering(value as ProductOrdering)}
              disabled={isLoading}
            />
          </label>
        </FilterBar>

        <PageCard>
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <h2 className="m-0 text-[1rem] font-semibold text-text-primary">
                {t('products.catalogTitle')}
              </h2>
              <span className="text-[12px] font-medium text-text-muted">
                {t('products.catalogHint')}
              </span>
            </div>

            <DataTable
              data={products}
              columns={columns}
              rowKey="id"
              selectedRowKey={selectedProductId}
              loading={isLoading}
              onRowClick={(product) => setSelectedProductId(product.id)}
              emptyTitle={t('products.emptyTitle')}
              emptyDescription={t('products.emptyDescription')}
            />
          </div>
        </PageCard>

        {!isLoading && paginationMeta.totalItems > 0 ? (
          <Pagination
            currentPage={Math.min(currentPage, paginationMeta.totalPages)}
            totalPages={paginationMeta.totalPages}
            totalItems={paginationMeta.totalItems}
            onPageChange={setCurrentPage}
          />
        ) : null}
      </PageSection>

      {selectedProductId ? (
        <ProductDetailPanel
          productId={selectedProductId}
          onClose={() => setSelectedProductId(null)}
          onProductChanged={() => setReloadCursor((current) => current + 1)}
          onEdit={(product) => {
            openEditForm(product);
            setSelectedProductId(null);
          }}
          onDelete={(product) => {
            requestDelete(product);
            setSelectedProductId(null);
          }}
        />
      ) : null}

      {isFormOpen ? (
        <ProductFormPanel
          mode={formMode}
          product={editingProduct}
          currencyOptions={formCurrencyOptions}
          isSubmitting={isSaving}
          errorMessage={formErrorMessage}
          onClose={() => {
            if (!isSaving) {
              setIsFormOpen(false);
              setEditingProduct(null);
              setFormErrorMessage(null);
            }
          }}
          onSubmit={(payload, options) => {
            void handleSaveProduct(payload, options);
          }}
        />
      ) : null}

      {productToDelete ? (
        <ProductDeleteDialog
          product={productToDelete}
          isDeleting={isDeleting}
          onCancel={() => {
            if (!isDeleting) {
              setProductToDelete(null);
            }
          }}
          onConfirm={() => {
            void handleConfirmDelete();
          }}
        />
      ) : null}
    </PageLayout>
  );
}

export default ProductsPage;
