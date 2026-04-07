import { useEffect, useMemo, useState } from 'react';
import { FiAlertTriangle, FiEdit2, FiImage, FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { DEFAULT_CURRENCY_CODE, formatCurrencyAmount } from '../../../constants';
import {
  DataTable,
  FilterBar,
  FilterSelect,
  Pagination,
  SearchInput,
  StatusBadge,
  Switch,
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
import ProductCategoryDeleteDialog from '../../../features/products/components/ProductCategoryDeleteDialog';
import ProductBrandDeleteDialog from '../../../features/products/components/ProductBrandDeleteDialog';
import ProductDetailPanel from '../../../features/products/components/ProductDetailPanel';
import ProductFormPanel from '../../../features/products/components/ProductFormPanel';
import ProductCategoryFormDialog from '../../../features/products/components/ProductCategoryFormDialog';
import ProductBrandFormDialog from '../../../features/products/components/ProductBrandFormDialog';
import { formatLocalizedDate } from '../../../i18n/date-format';
import { usePersistentState } from '../../../lib/persistent-state';
import { services } from '../../../services';
import type {
  PaginationMeta,
  Product,
  ProductCategory,
  ProductBrand,
  ProductMutationInput,
  ProductBrandMutationInput,
  SelectOption,
  TableQueryParams,
} from '../../../types/domain';

type ActiveFilter = 'all' | 'active' | 'inactive';
type CatalogView = 'products' | 'promoted' | 'categories' | 'brands';
type ProductOrdering =
  | '-created_at'
  | 'created_at'
  | 'name'
  | '-name'
  | 'price'
  | '-price';
type CategoryOrdering =
  | '-created_at'
  | 'created_at'
  | '-updated_at'
  | 'updated_at'
  | 'name'
  | '-name';

type BrandOrdering =
  | '-created_at'
  | 'created_at'
  | '-updated_at'
  | 'updated_at'
  | 'name'
  | '-name';

const PAGE_SIZE = 8;
const SERVICE_FETCH_SIZE = 500;
const SEARCH_DEBOUNCE_MS = 350;
const ALL_CURRENCIES_VALUE = 'all';
const ALL_CATEGORIES_VALUE = 'all';
const DEFAULT_ORDERING: ProductOrdering = '-created_at';
const DEFAULT_CATEGORY_ORDERING: CategoryOrdering = '-created_at';
const DEFAULT_BRAND_ORDERING: BrandOrdering = '-created_at';

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
  'inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface-card text-text-secondary shadow-sm ring-1 ring-border-soft/40 transition duration-fast hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-45';
const warningRowClassName =
  [
    'bg-transparent',
    '[&>td]:!bg-warning-bg/30 [&>td]:border-y [&>td]:border-warning/25',
    '[&>td:first-child]:border-l [&>td:last-child]:border-r',
    '[&>td:first-child]:rounded-l-lg [&>td:last-child]:rounded-r-lg',
    'hover:[&>td]:!bg-warning-bg/40',
  ].join(' ');

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

function parseCategoryOrdering(ordering: CategoryOrdering): Pick<
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

function parseBrandOrdering(ordering: BrandOrdering): Pick<
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

function resolveStockQuantity(product: Product): number {
  if (typeof product.stockQuantity === 'number' && Number.isFinite(product.stockQuantity)) {
    return Math.max(0, Math.floor(product.stockQuantity));
  }

  return 0;
}

function resolveMinimalStock(product: Product): number {
  if (typeof product.minimalStock === 'number' && Number.isFinite(product.minimalStock)) {
    return Math.max(0, Math.floor(product.minimalStock));
  }

  return 0;
}

function isProductAtMinimalStock(product: Product): boolean {
  const minimalStock = resolveMinimalStock(product);
  const stockQuantity = resolveStockQuantity(product);
  return stockQuantity <= minimalStock;
}

function prioritizeLowStockProducts(products: Product[]): Product[] {
  const lowStockProducts: Product[] = [];
  const normalProducts: Product[] = [];

  products.forEach((product) => {
    if (isProductAtMinimalStock(product)) {
      lowStockProducts.push(product);
      return;
    }

    normalProducts.push(product);
  });

  // Keep existing order within each group; only move low-stock group to top.
  return [...lowStockProducts, ...normalProducts];
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readMessage(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractApiErrorDetails(error: unknown): {
  statusCode: number | null;
  message: string | null;
} {
  const topLevel = toRecord(error);
  const response = toRecord(topLevel?.response);
  const data = response?.data;
  const dataRecord = toRecord(data);

  const statusCode =
    typeof response?.status === 'number' ? response.status : null;

  const candidates: Array<unknown> = [
    dataRecord?.detail,
    dataRecord?.message,
    dataRecord?.error,
    Array.isArray(dataRecord?.non_field_errors)
      ? (dataRecord.non_field_errors as unknown[])[0]
      : null,
    Array.isArray(dataRecord?.errors)
      ? (dataRecord.errors as unknown[])[0]
      : null,
    Array.isArray(data) ? (data as unknown[])[0] : null,
    topLevel?.message,
  ];

  for (const candidate of candidates) {
    const message = readMessage(candidate);
    if (message) {
      return { statusCode, message };
    }
  }

  return { statusCode, message: null };
}

function isLinkedOrderDeleteError(statusCode: number | null, message: string | null): boolean {
  if (statusCode === 409) {
    return true;
  }

  if (!message) {
    return false;
  }

  const normalized = message.toLocaleLowerCase();
  const matchesReferenceMessage =
    normalized.includes('buyurtma') ||
    normalized.includes('order') ||
    normalized.includes('foreign key') ||
    normalized.includes('integrity') ||
    normalized.includes('constraint') ||
    normalized.includes('related object') ||
    normalized.includes('referenc') ||
    normalized.includes('protected');

  if (statusCode === 400 || statusCode === 422) {
    return matchesReferenceMessage;
  }

  return matchesReferenceMessage;
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

  const categoryOrderingOptions = useMemo<SelectOption[]>(
    () => [
      { value: '-created_at', label: t('products.createdNewest') },
      { value: 'created_at', label: t('products.createdOldest') },
      { value: '-updated_at', label: t('products.updatedNewest') },
      { value: 'updated_at', label: t('products.updatedOldest') },
      { value: 'name', label: t('products.nameAz') },
      { value: '-name', label: t('products.nameZa') },
    ],
    [t],
  );

  const brandOrderingOptions = useMemo<SelectOption[]>(
    () => [
      { value: '-created_at', label: t('products.createdNewest') },
      { value: 'created_at', label: t('products.createdOldest') },
      { value: '-updated_at', label: t('products.updatedNewest') },
      { value: 'updated_at', label: t('products.updatedOldest') },
      { value: 'name', label: t('products.nameAz') },
      { value: '-name', label: t('products.nameZa') },
    ],
    [t],
  );

  const [search, setSearch] = usePersistentState('products:search', '');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [catalogView, setCatalogView] = usePersistentState<CatalogView>(
    'products:catalog-view',
    'products',
    {
      deserialize: (value) => {
        const parsed = JSON.parse(value);
        return parsed === 'categories' || parsed === 'promoted' || parsed === 'brands'
          ? parsed
          : 'products';
      },
    },
  );
  const [currencyFilter, setCurrencyFilter] = useState(ALL_CURRENCIES_VALUE);
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES_VALUE);
  const [brandFilter, setBrandFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [ordering, setOrdering] = useState<ProductOrdering>(DEFAULT_ORDERING);
  const [currentPage, setCurrentPage] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>(
    DEFAULT_PAGINATION_META,
  );
  const [currencyOptions, setCurrencyOptions] = useState<SelectOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [brandOptions, setBrandOptions] = useState<SelectOption[]>([]);
  const [isCategoryOptionsLoading, setIsCategoryOptionsLoading] = useState(true);
  const [isBrandOptionsLoading, setIsBrandOptionsLoading] = useState(true);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categorySearch, setCategorySearch] = usePersistentState(
    'products:categories-search',
    '',
  );
  const [debouncedCategorySearch, setDebouncedCategorySearch] = useState('');
  const [categoryActiveFilter, setCategoryActiveFilter] = useState<ActiveFilter>('all');
  const [categoryOrdering, setCategoryOrdering] = useState<CategoryOrdering>(
    DEFAULT_CATEGORY_ORDERING,
  );
  const [categoryCurrentPage, setCategoryCurrentPage] = useState(1);
  const [categoryPaginationMeta, setCategoryPaginationMeta] = useState<PaginationMeta>(
    DEFAULT_PAGINATION_META,
  );
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);
  const [categoryHasError, setCategoryHasError] = useState(false);
  const [isCategoryStatusUpdatingId, setIsCategoryStatusUpdatingId] = useState<
    string | null
  >(null);
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
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [categoryFormMode, setCategoryFormMode] = useState<'create' | 'edit'>('create');
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [isCategorySaving, setIsCategorySaving] = useState(false);
  const [categoryErrorMessage, setCategoryErrorMessage] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategory | null>(null);
  const [isCategoryDeleting, setIsCategoryDeleting] = useState(false);

  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [isDeleteConfirmDisabled, setIsDeleteConfirmDisabled] = useState(false);
  const [orderedProductIds, setOrderedProductIds] = useState<string[]>([]);
  const [isOrderUsageLoading, setIsOrderUsageLoading] = useState(true);

  const [brands, setBrands] = useState<ProductBrand[]>([]);
  const [brandSearch, setBrandSearch] = usePersistentState(
    'products:brands-search',
    '',
  );
  const [debouncedBrandSearch, setDebouncedBrandSearch] = useState('');
  const [brandActiveFilter, setBrandActiveFilter] = useState<ActiveFilter>('all');
  const [brandOrdering, setBrandOrdering] = useState<BrandOrdering>(
    DEFAULT_BRAND_ORDERING,
  );
  const [brandCurrentPage, setBrandCurrentPage] = useState(1);
  const [brandPaginationMeta, setBrandPaginationMeta] = useState<PaginationMeta>(
    DEFAULT_PAGINATION_META,
  );
  const [isBrandsLoading, setIsBrandsLoading] = useState(false);
  const [brandHasError, setBrandHasError] = useState(false);
  const [isBrandStatusUpdatingId, setIsBrandStatusUpdatingId] = useState<
    string | null
  >(null);

  const [isBrandFormOpen, setIsBrandFormOpen] = useState(false);
  const [brandFormMode, setBrandFormMode] = useState<'create' | 'edit'>('create');
  const [editingBrand, setEditingBrand] = useState<ProductBrand | null>(null);
  const [isBrandSaving, setIsBrandSaving] = useState(false);
  const [brandErrorMessage, setBrandErrorMessage] = useState<string | null>(null);
  const [brandToDelete, setBrandToDelete] = useState<ProductBrand | null>(null);
  const [isBrandDeleting, setIsBrandDeleting] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedCategorySearch(categorySearch.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [categorySearch]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedBrandSearch(brandSearch.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [brandSearch]);

  const currencyAllOption = useMemo<SelectOption>(
    () => ({
      value: ALL_CURRENCIES_VALUE,
      label: t('products.allCurrencies'),
    }),
    [t],
  );

  const categoryAllOption = useMemo<SelectOption>(
    () => ({
      value: ALL_CATEGORIES_VALUE,
      label: t('products.allCategories', {
        defaultValue: 'Barcha kategoriyalar',
      }),
    }),
    [t],
  );

  const brandAllOption = useMemo<SelectOption>(
    () => ({
      value: 'all',
      label: t('products.allBrands', { defaultValue: 'Barcha brendlar' }),
    }),
    [t],
  );

  const productCategoryFilterOptions = useMemo<SelectOption[]>(
    () => [categoryAllOption, ...categoryOptions],
    [categoryAllOption, categoryOptions],
  );

  const brandFilterOptions = useMemo<SelectOption[]>(
    () => [brandAllOption, ...brandOptions],
    [brandAllOption, brandOptions],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [catalogView, debouncedSearch, currencyFilter, categoryFilter, brandFilter, activeFilter, ordering]);

  useEffect(() => {
    setCategoryCurrentPage(1);
  }, [debouncedCategorySearch, categoryActiveFilter, categoryOrdering]);

  useEffect(() => {
    setBrandCurrentPage(1);
  }, [debouncedBrandSearch, brandActiveFilter, brandOrdering]);

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

    async function loadCategoryOptions() {
      setIsCategoryOptionsLoading(true);

      try {
        const result = await services.products.listProductCategories({
          page: 1,
          pageSize: SERVICE_FETCH_SIZE,
          ordering: 'name',
          is_active: true,
        });

        if (!isActive) {
          return;
        }

        const options = result.items
          .map((category) => ({
            value: category.id,
            label: category.name,
            description: category.code,
          }))
          .sort((left, right) => left.label.localeCompare(right.label));

        setCategoryOptions(options);
      } catch {
        if (!isActive) {
          return;
        }

        setCategoryOptions([]);
      } finally {
        if (isActive) {
          setIsCategoryOptionsLoading(false);
        }
      }
    }

    void loadCategoryOptions();

    return () => {
      isActive = false;
    };
  }, [reloadCursor]);

  useEffect(() => {
    let isActive = true;

    async function loadBrandOptions() {
      setIsBrandOptionsLoading(true);

      try {
        const result = await services.products.listProductBrands({
          page: 1,
          pageSize: SERVICE_FETCH_SIZE,
          ordering: 'name',
          is_active: true,
        });

        if (!isActive) {
          return;
        }

        const options = result.items
          .map((brand) => ({
            value: brand.id,
            label: brand.name,
            description: brand.code,
          }))
          .sort((left, right) => left.label.localeCompare(right.label));

        setBrandOptions(options);
      } catch {
        if (!isActive) {
          return;
        }

        setBrandOptions([]);
      } finally {
        if (isActive) {
          setIsBrandOptionsLoading(false);
        }
      }
    }

    void loadBrandOptions();

    return () => {
      isActive = false;
    };
  }, [brandAllOption, reloadCursor]);

  useEffect(() => {
    let isActive = true;

    async function loadOrderedProducts() {
      setIsOrderUsageLoading(true);

      try {
        const productIds = new Set<string>();
        let page = 1;
        let totalPages = 1;

        do {
          const result = await services.orders.list({
            page,
            pageSize: SERVICE_FETCH_SIZE,
            ordering: '-created_at',
          });

          result.items.forEach((order) => {
            order.items.forEach((item) => {
              const productId = item.product?.id?.trim();
              if (productId) {
                productIds.add(productId);
              }
            });
          });

          totalPages = result.meta.totalPages;
          page += 1;
        } while (page <= totalPages);

        if (!isActive) {
          return;
        }

        setOrderedProductIds(Array.from(productIds));
      } catch {
        if (!isActive) {
          return;
        }

        setOrderedProductIds([]);
      } finally {
        if (isActive) {
          setIsOrderUsageLoading(false);
        }
      }
    }

    void loadOrderedProducts();

    function handleWindowFocus() {
      void loadOrderedProducts();
    }

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      isActive = false;
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [reloadCursor]);

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
          search: debouncedSearch || undefined,
          category:
            categoryFilter === ALL_CATEGORIES_VALUE ? undefined : categoryFilter,
          brand:
            brandFilter === 'all' ? undefined : brandFilter,
          currency:
            currencyFilter === ALL_CURRENCIES_VALUE ? undefined : currencyFilter,
          is_active:
            activeFilter === 'all' ? undefined : activeFilter === 'active',
          is_promoted: catalogView === 'promoted' ? true : undefined,
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

        setProducts(prioritizeLowStockProducts(result.items));
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
  }, [
    activeFilter,
    catalogView,
    categoryFilter,
    currencyFilter,
    currentPage,
    debouncedSearch,
    ordering,
    reloadCursor,
  ]);

  useEffect(() => {
    let isActive = true;

    async function loadCategories() {
      setIsCategoriesLoading(true);
      setCategoryHasError(false);

      try {
        const sortConfig = parseCategoryOrdering(categoryOrdering);
        const result = await services.products.listProductCategories({
          page: categoryCurrentPage,
          pageSize: PAGE_SIZE,
          search: debouncedCategorySearch || undefined,
          is_active:
            categoryActiveFilter === 'all'
              ? undefined
              : categoryActiveFilter === 'active',
          ordering: categoryOrdering,
          ...sortConfig,
        });

        if (!isActive) {
          return;
        }

        if (categoryCurrentPage > result.meta.totalPages) {
          setCategoryCurrentPage(result.meta.totalPages);
          return;
        }

        setCategories(result.items);
        setCategoryPaginationMeta(result.meta);
      } catch {
        if (!isActive) {
          return;
        }

        setCategoryHasError(true);
        setCategories([]);
        setCategoryPaginationMeta(DEFAULT_PAGINATION_META);
      } finally {
        if (isActive) {
          setIsCategoriesLoading(false);
        }
      }
    }

    if (catalogView === 'categories') {
      void loadCategories();
    }

    return () => {
      isActive = false;
    };
  }, [
    categoryActiveFilter,
    categoryCurrentPage,
    categoryOrdering,
    catalogView,
    debouncedCategorySearch,
    reloadCursor,
  ]);

  useEffect(() => {
    let isActive = true;

    async function loadBrands() {
      setIsBrandsLoading(true);
      setBrandHasError(false);

      try {
        const sortConfig = parseBrandOrdering(brandOrdering);
        const result = await services.products.listProductBrands({
          page: brandCurrentPage,
          pageSize: PAGE_SIZE,
          search: debouncedBrandSearch || undefined,
          is_active:
            brandActiveFilter === 'all'
              ? undefined
              : brandActiveFilter === 'active',
          ordering: brandOrdering,
          ...sortConfig,
        });

        if (!isActive) {
          return;
        }

        if (brandCurrentPage > result.meta.totalPages) {
          setBrandCurrentPage(result.meta.totalPages);
          return;
        }

        setBrands(result.items);
        setBrandPaginationMeta(result.meta);
      } catch {
        if (!isActive) {
          return;
        }

        setBrandHasError(true);
        setBrands([]);
        setBrandPaginationMeta(DEFAULT_PAGINATION_META);
      } finally {
        if (isActive) {
          setIsBrandsLoading(false);
        }
      }
    }

    if (catalogView === 'brands') {
      void loadBrands();
    }

    return () => {
      isActive = false;
    };
  }, [
    brandActiveFilter,
    brandCurrentPage,
    brandOrdering,
    catalogView,
    debouncedBrandSearch,
    reloadCursor,
  ]);

  useEffect(() => {
    if (!selectedProductId) {
      return;
    }

    const selectedVisible = products.some((product) => product.id === selectedProductId);
    if (!selectedVisible) {
      setSelectedProductId(null);
    }
  }, [products, selectedProductId]);

  const orderedProductIdSet = useMemo(
    () => new Set(orderedProductIds),
    [orderedProductIds],
  );

  function getDeleteBlockReason(productId: string): string | null {
    if (isOrderUsageLoading) {
      return t('products.deleteDialog.orderCheckInProgress', {
        defaultValue: "Buyurtmalar bilan bog'liqlik tekshirilmoqda. Iltimos, biroz kuting.",
      });
    }

    if (orderedProductIdSet.has(productId)) {
      return t('products.deleteDialog.linkedOrderError', {
        defaultValue:
          "Bu mahsulot buyurtmalarda ishlatilgan. O'chirib bo'lmaydi, mahsulotni nofaol holatga o'tkazing.",
      });
    }

    return null;
  }

  function isDeleteBlocked(productId: string): boolean {
    return getDeleteBlockReason(productId) !== null;
  }

  function openCreateForm() {
    setFormMode('create');
    setEditingProduct(null);
    setFormErrorMessage(null);
    setIsFormOpen(true);
  }

  function openCategoryCreateForm() {
    setCategoryFormMode('create');
    setEditingCategory(null);
    setCategoryErrorMessage(null);
    setIsCategoryFormOpen(true);
  }

  function openCategoryEditForm(category: ProductCategory) {
    setCategoryFormMode('edit');
    setEditingCategory(category);
    setCategoryErrorMessage(null);
    setIsCategoryFormOpen(true);
  }

  function openBrandCreateForm() {
    setBrandFormMode('create');
    setEditingBrand(null);
    setBrandErrorMessage(null);
    setIsBrandFormOpen(true);
  }

  function openBrandEditForm(brand: ProductBrand) {
    setBrandFormMode('edit');
    setEditingBrand(brand);
    setBrandErrorMessage(null);
    setIsBrandFormOpen(true);
  }

  function openEditForm(product: Product) {
    setFormMode('edit');
    setFormErrorMessage(null);
    setEditingProduct(product);
    setIsFormOpen(true);

    void (async () => {
      try {
        const freshProduct = await services.products.getProductById(product.id);
        if (freshProduct) {
          setEditingProduct(freshProduct);
        }
      } catch {
        // Keep optimistic product data if refresh fails.
      }
    })();
  }

  function requestDelete(product: Product) {
    const blockReason = getDeleteBlockReason(product.id);
    setDeleteErrorMessage(blockReason);
    setIsDeleteConfirmDisabled(Boolean(blockReason));
    setProductToDelete(product);
  }

  function requestCategoryDelete(category: ProductCategory) {
    setCategoryToDelete(category);
  }

  function requestBrandDelete(brand: ProductBrand) {
    setBrandToDelete(brand);
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
    if (!productToDelete || isDeleteConfirmDisabled) {
      return;
    }

    const blockReason = getDeleteBlockReason(productToDelete.id);
    if (blockReason) {
      setDeleteErrorMessage(blockReason);
      setIsDeleteConfirmDisabled(true);
      return;
    }

    setDeleteErrorMessage(null);
    setIsDeleteConfirmDisabled(false);
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
      setIsDeleteConfirmDisabled(false);
      setReloadCursor((current) => current + 1);
    } catch (error) {
      const { statusCode, message } = extractApiErrorDetails(error);

      if (isLinkedOrderDeleteError(statusCode, message)) {
        setIsDeleteConfirmDisabled(true);
        setDeleteErrorMessage(
          t('products.deleteDialog.linkedOrderError', {
            defaultValue:
              "Bu mahsulot buyurtmalarda ishlatilgan. O'chirib bo'lmaydi, mahsulotni nofaol holatga o'tkazing.",
          }),
        );
        return;
      }

      setDeleteErrorMessage(
        message ??
          t('products.deleteDialog.deleteError', {
            defaultValue: "Mahsulotni o'chirishda xatolik yuz berdi.",
          }),
      );
      setIsDeleteConfirmDisabled(false);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSaveCategory(payload: {
    name: string;
    code: string;
    description: string;
    isActive: boolean;
    image?: File | null;
  }) {
    setIsCategorySaving(true);
    setCategoryErrorMessage(null);

    try {
      if (categoryFormMode === 'create') {
        await services.products.createProductCategory({
          name: payload.name,
          code: payload.code,
          description: payload.description,
          isActive: payload.isActive,
          image: payload.image,
        });
      } else {
        if (!editingCategory) {
          throw new Error(t('products.categoryForm.saveError'));
        }

        await services.products.updateProductCategory(editingCategory.id, {
          name: payload.name,
          code: payload.code,
          description: payload.description,
          isActive: payload.isActive,
          image: payload.image,
        });
      }

      setIsCategoryFormOpen(false);
      setEditingCategory(null);
      setReloadCursor((current) => current + 1);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('products.categoryForm.saveError');
      setCategoryErrorMessage(message);
    } finally {
      setIsCategorySaving(false);
    }
  }

  async function handleConfirmCategoryDelete() {
    if (!categoryToDelete) {
      return;
    }

    setIsCategoryDeleting(true);

    try {
      const deleted = await services.products.deleteProductCategory(categoryToDelete.id);
      if (!deleted) {
        throw new Error();
      }

      setCategoryToDelete(null);
      setReloadCursor((current) => current + 1);
    } catch {
      // Keep dialog open if deletion fails.
    } finally {
      setIsCategoryDeleting(false);
    }
  }

  async function handleSaveBrand(payload: {
    name: string;
    code: string;
    description: string;
    isActive: boolean;
  }) {
    setIsBrandSaving(true);
    setBrandErrorMessage(null);

    try {
      if (brandFormMode === 'create') {
        await services.products.createProductBrand({
          name: payload.name,
          code: payload.code,
          description: payload.description,
          isActive: payload.isActive,
        });
      } else {
        if (!editingBrand) {
          throw new Error(t('products.brandForm.saveError', { defaultValue: 'Brendni saqlashda xatolik yuz berdi.' }));
        }

        await services.products.updateProductBrand(editingBrand.id, {
          name: payload.name,
          code: payload.code,
          description: payload.description,
          isActive: payload.isActive,
        });
      }

      setIsBrandFormOpen(false);
      setEditingBrand(null);
      setReloadCursor((current) => current + 1);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('products.brandForm.saveError', { defaultValue: 'Brendni saqlashda xatolik yuz berdi.' });
      setBrandErrorMessage(message);
    } finally {
      setIsBrandSaving(false);
    }
  }

  async function handleConfirmBrandDelete() {
    if (!brandToDelete) {
      return;
    }

    setIsBrandDeleting(true);

    try {
      const deleted = await services.products.deleteProductBrand(brandToDelete.id);
      if (!deleted) {
        throw new Error();
      }

      setBrandToDelete(null);
      setReloadCursor((current) => current + 1);
    } catch {
      // Keep dialog open if deletion fails.
    } finally {
      setIsBrandDeleting(false);
    }
  }

  async function handleToggleBrandActive(brand: ProductBrand, nextValue: boolean) {
    if (isBrandStatusUpdatingId) {
      return;
    }

    setIsBrandStatusUpdatingId(brand.id);
    try {
      const updated = await services.products.patchProductBrand(brand.id, {
        isActive: nextValue,
      });

      if (updated) {
        setBrands((current) =>
          current.map((entry) => (entry.id === updated.id ? updated : entry)),
        );
      }

      setReloadCursor((current) => current + 1);
    } catch {
      // Keep current state if update fails.
    } finally {
      setIsBrandStatusUpdatingId(null);
    }
  }

  async function handleToggleCategoryActive(category: ProductCategory, nextValue: boolean) {
    if (isCategoryStatusUpdatingId) {
      return;
    }

    setIsCategoryStatusUpdatingId(category.id);
    try {
      const updated = await services.products.patchProductCategory(category.id, {
        isActive: nextValue,
      });

      if (updated) {
        setCategories((current) =>
          current.map((entry) => (entry.id === updated.id ? updated : entry)),
        );
      }

      setReloadCursor((current) => current + 1);
    } catch {
      // Keep current state if update fails.
    } finally {
      setIsCategoryStatusUpdatingId(null);
    }
  }

  const productColumns = useMemo<DataTableColumn<Product>[]>(() => {
    return [
      {
        key: 'product',
        label: t('products.columns.product'),
        render: (product) => {
          const isLowStock = isProductAtMinimalStock(product);

          return (
          <div className="flex items-center gap-2.5">
            {product.images[0]?.imageUrl || product.imageUrl ? (
              <img
                src={product.images[0]?.imageUrl ?? product.imageUrl}
                alt={product.name}
                className={[
                  'h-10 w-10 shrink-0 rounded-md object-cover ring-1',
                  isLowStock ? 'ring-warning/40' : 'ring-border-soft/45',
                ].join(' ')}
                loading="lazy"
              />
            ) : (
              <span
                className={[
                  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-text-muted ring-1',
                  isLowStock
                    ? 'bg-warning-bg/45 ring-warning/40'
                    : 'bg-surface-subtle ring-border-soft/45',
                ].join(' ')}
              >
                <FiImage className="h-4 w-4" />
              </span>
            )}
            <div className="grid gap-0.5">
              <span className={tablePrimaryTextClassName}>{product.name}</span>
              <span className={tableSecondaryTextClassName}>
                {product.description || t('products.noDescription')}
              </span>
              {isLowStock ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-warning">
                  <FiAlertTriangle className="h-3.5 w-3.5" />
                  {t('products.lowStockWarning', { defaultValue: 'Kam zaxira' })}
                </span>
              ) : null}
              {product.isPromoted ? (
                <span className="inline-flex items-center gap-1 rounded-pill bg-primary/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-accent">
                  {t('products.promotedBadge')}
                </span>
              ) : null}
            </div>
          </div>
          );
        },
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
        render: (product) => {
          const stockQuantity = resolveStockQuantity(product);
          const minimalStock = resolveMinimalStock(product);
          const isLowStock = isProductAtMinimalStock(product);

          return (
            <div className="grid gap-0.5">
              <span
                className={[
                  tablePrimaryTextClassName,
                  isLowStock ? 'text-warning' : '',
                ].join(' ')}
              >
                {stockQuantity}
              </span>
              <span className="text-[11px] font-medium text-text-muted">
                {t('products.minStockLabel', { defaultValue: 'Min' })}: {minimalStock}
              </span>
            </div>
          );
        },
      },
      {
        key: 'status',
        label: t('products.columns.status'),
        render: (product) => {
          const isLowStock = isProductAtMinimalStock(product);

          return (
            <StatusBadge
              status={product.isActive ? 'active' : 'inactive'}
              label={
                isLowStock
                  ? t('products.lowStockWarning', { defaultValue: 'Kam zaxira' })
                  : product.isActive
                    ? t('common.active')
                    : t('common.inactive')
              }
              tone={isLowStock ? 'warning' : product.isActive ? 'success' : 'neutral'}
            />
          );
        },
      },
      {
        key: 'updatedAt',
        label: t('products.columns.updated'),
        render: (product) => (
          <span className={tablePrimaryTextClassName}>
            {product.updatedAt
              ? formatLocalizedDate(product.updatedAt, i18n.language, {
                  locale,
                  withYear: true,
                  shortMonth: true,
                  fallback: t('common.na'),
                })
              : t('common.na')}
          </span>
        ),
      },
      {
        key: 'actions',
        label: t('products.columns.actions'),
        align: 'right',
        render: (product) => {
          const deleteBlockReason = getDeleteBlockReason(product.id);
          const isDeleteDisabled = Boolean(deleteBlockReason);

          return (
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
                disabled={isDeleteDisabled}
                title={deleteBlockReason ?? undefined}
                aria-label={`${t('products.actions.delete')} ${product.name}`}
              >
                <FiTrash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        },
      },
    ];
  }, [i18n.language, locale, t, orderedProductIdSet, isOrderUsageLoading]);

  const categoryColumns = useMemo<DataTableColumn<ProductCategory>[]>(() => {
    return [
      {
        key: 'name',
        label: t('products.categoryColumns.name'),
        render: (category) => (
          <div className="flex items-center gap-2.5">
            {category.imageUrl ? (
              <img
                src={category.imageUrl}
                alt={category.name}
                className="h-10 w-10 shrink-0 rounded-md object-cover ring-1 ring-border-soft/45"
                loading="lazy"
              />
            ) : (
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-subtle text-text-muted ring-1 ring-border-soft/45">
                <FiImage className="h-4 w-4" />
              </span>
            )}
            <div className="grid gap-0.5">
              <span className={tablePrimaryTextClassName}>{category.name}</span>
              <span className={tableSecondaryTextClassName}>
                {category.description || t('products.categoryNoDescription')}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'code',
        label: t('products.categoryColumns.code'),
        render: (category) => (
          <span className={tablePrimaryTextClassName}>{category.code}</span>
        ),
      },
      {
        key: 'status',
        label: t('products.categoryColumns.status'),
        render: (category) => (
          <div className="flex items-center gap-2">
            <StatusBadge
              status={category.isActive ? 'active' : 'inactive'}
              label={category.isActive ? t('common.active') : t('common.inactive')}
              tone={category.isActive ? 'success' : 'neutral'}
            />
            <Switch
              checked={category.isActive}
              onChange={(nextValue) => {
                void handleToggleCategoryActive(category, nextValue);
              }}
              disabled={isCategoryStatusUpdatingId === category.id}
              stopPropagation
              ariaLabel={`${category.name} holatini almashtirish`}
            />
          </div>
        ),
      },
      {
        key: 'updatedAt',
        label: t('products.categoryColumns.updated'),
        render: (category) => (
          <span className={tablePrimaryTextClassName}>
            {category.updatedAt
              ? formatLocalizedDate(category.updatedAt, i18n.language, {
                  locale,
                  withYear: true,
                  shortMonth: true,
                  fallback: t('common.na'),
                })
              : t('common.na')}
          </span>
        ),
      },
      {
        key: 'actions',
        label: t('products.categoryColumns.actions'),
        align: 'right',
        render: (category) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              className={actionButtonClassName}
              onClick={(event) => {
                event.stopPropagation();
                openCategoryEditForm(category);
              }}
              aria-label={`${t('products.categoryActions.edit')} ${category.name}`}
            >
              <FiEdit2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className={actionButtonClassName}
              onClick={(event) => {
                event.stopPropagation();
                requestCategoryDelete(category);
              }}
              aria-label={`${t('products.categoryActions.delete')} ${category.name}`}
            >
              <FiTrash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      },
    ];
  }, [
    t,
  ]);

  const brandColumns = useMemo<DataTableColumn<ProductBrand>[]>(() => {
    return [
      {
        key: 'name',
        label: t('products.brandColumns.name', { defaultValue: 'Brend nomi' }),
        render: (brand) => (
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-subtle text-text-muted ring-1 ring-border-soft/45 font-bold uppercase text-xs">
              {brand.name.charAt(0)}
            </span>
            <div className="grid gap-0.5">
              <span className={tablePrimaryTextClassName}>{brand.name}</span>
              <span className={tableSecondaryTextClassName}>
                {brand.description || t('products.brandNoDescription', { defaultValue: 'Tavsif yo\'q' })}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'code',
        label: t('products.brandColumns.code', { defaultValue: 'Kod' }),
        render: (brand) => (
          <span className={tablePrimaryTextClassName}>{brand.code}</span>
        ),
      },
      {
        key: 'status',
        label: t('products.brandColumns.status', { defaultValue: 'Holati' }),
        render: (brand) => (
          <div className="flex items-center gap-2">
            <StatusBadge
              status={brand.isActive ? 'active' : 'inactive'}
              label={brand.isActive ? t('common.active') : t('common.inactive')}
              tone={brand.isActive ? 'success' : 'neutral'}
            />
            <Switch
              checked={brand.isActive}
              onChange={(nextValue) => {
                void handleToggleBrandActive(brand, nextValue);
              }}
              disabled={isBrandStatusUpdatingId === brand.id}
              stopPropagation
              ariaLabel={`${brand.name} holatini almashtirish`}
            />
          </div>
        ),
      },
      {
        key: 'updatedAt',
        label: t('products.brandColumns.updated', { defaultValue: 'Yangilandi' }),
        render: (brand) => (
          <span className={tablePrimaryTextClassName}>
            {brand.updatedAt
              ? formatLocalizedDate(brand.updatedAt, i18n.language, {
                  locale,
                  withYear: true,
                  shortMonth: true,
                  fallback: t('common.na'),
                })
              : t('common.na')}
          </span>
        ),
      },
      {
        key: 'actions',
        label: t('products.brandColumns.actions', { defaultValue: 'Amallar' }),
        align: 'right',
        render: (brand) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              className={actionButtonClassName}
              onClick={(event) => {
                event.stopPropagation();
                openBrandEditForm(brand);
              }}
              aria-label={`${t('products.brandActions.edit', { defaultValue: 'Brendni tahrirlash' })} ${brand.name}`}
            >
              <FiEdit2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className={actionButtonClassName}
              onClick={(event) => {
                event.stopPropagation();
                requestBrandDelete(brand);
              }}
              aria-label={`${t('products.brandActions.delete', { defaultValue: 'Brendni o\'chirish' })} ${brand.name}`}
            >
              <FiTrash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      },
    ];
  }, [
    i18n.language,
    isBrandStatusUpdatingId,
    locale,
    t,
  ]);

  const productActiveFilterCount =
    Number(currencyFilter !== ALL_CURRENCIES_VALUE) +
    Number(categoryFilter !== ALL_CATEGORIES_VALUE) +
    Number(activeFilter !== 'all') +
    Number(ordering !== DEFAULT_ORDERING);
  const categoryActiveFilterCount =
    Number(categoryActiveFilter !== 'all') +
    Number(categoryOrdering !== DEFAULT_CATEGORY_ORDERING);
  const brandActiveFilterCount =
    Number(brandActiveFilter !== 'all') +
    Number(brandOrdering !== DEFAULT_BRAND_ORDERING);
  const activeFilterCount =
    catalogView === 'brands'
      ? brandActiveFilterCount
      : catalogView === 'categories'
        ? categoryActiveFilterCount
        : productActiveFilterCount;
  const activeTotalItems =
    catalogView === 'brands'
      ? brandPaginationMeta.totalItems
      : catalogView === 'categories'
        ? categoryPaginationMeta.totalItems
        : paginationMeta.totalItems;

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
          <button
            type="button"
            className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-surface-card px-3.5 text-sm font-semibold text-text-primary shadow-sm ring-1 ring-border-soft/40 transition duration-fast hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            onClick={openCategoryCreateForm}
          >
            <AppIcon name="plus" className="h-4 w-4" aria-hidden="true" />
            {t('products.newCategory')}
          </button>
          <button
            type="button"
            className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-surface-card px-3.5 text-sm font-semibold text-text-primary shadow-sm ring-1 ring-border-soft/40 transition duration-fast hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            onClick={openBrandCreateForm}
          >
            <AppIcon name="plus" className="h-4 w-4" aria-hidden="true" />
            {t('products.newBrand', { defaultValue: 'Yangi brend' })}
          </button>
          <span className="inline-flex min-h-8 items-center gap-2 rounded-pill bg-primary/12 px-3 text-[12px] font-semibold text-text-accent">
            <AppIcon name="products" className="h-3.5 w-3.5" aria-hidden="true" />
            {activeTotalItems}{' '}
            {catalogView === 'categories'
              ? t('products.categoriesCountLabel')
              : catalogView === 'promoted'
                ? t('products.promotedCountLabel')
                : catalogView === 'brands'
                  ? t('products.brandsCountLabel', { defaultValue: 'brendlar' })
                  : t('products.title').toLowerCase()}
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
                {activeTotalItems}{' '}
                {catalogView === 'products'
                  ? t('products.records')
                  : t('products.categoriesRecords')}
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
          {catalogView !== 'categories' ? (
            <>
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder={t('products.searchPlaceholder')}
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

              <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_200px]">
                <span className={labelClassName}>
                  {t('products.form.brand', { defaultValue: 'Brend' })}
                </span>
                <FilterSelect
                  value={brandFilter}
                  options={brandFilterOptions}
                  onChange={setBrandFilter}
                  disabled={isLoading || isBrandOptionsLoading}
                />
              </label>

              <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_200px]">
                <span className={labelClassName}>
                  {t('products.form.category')}
                </span>
                <FilterSelect
                  value={categoryFilter}
                  options={productCategoryFilterOptions}
                  onChange={setCategoryFilter}
                  disabled={isLoading || isCategoryOptionsLoading}
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
            </>
          ) : catalogView === 'categories' ? (
            <>
              <SearchInput
                value={categorySearch}
                onChange={setCategorySearch}
                placeholder={t('products.categorySearchPlaceholder')}
              />

              <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_180px]">
                <span className={labelClassName}>{t('products.status')}</span>
                <FilterSelect
                  value={categoryActiveFilter}
                  options={activeFilterOptions}
                  onChange={(value) => setCategoryActiveFilter(value as ActiveFilter)}
                  disabled={isCategoriesLoading}
                />
              </label>

              <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_200px]">
                <span className={labelClassName}>{t('products.orderBy')}</span>
                <FilterSelect
                  value={categoryOrdering}
                  options={categoryOrderingOptions}
                  onChange={(value) => setCategoryOrdering(value as CategoryOrdering)}
                  disabled={isCategoriesLoading}
                />
              </label>
            </>
          ) : (
            <>
              <SearchInput
                value={brandSearch}
                onChange={setBrandSearch}
                placeholder={t('products.brandSearchPlaceholder', { defaultValue: 'Brendlar bo\'yicha qidirish...' })}
              />

              <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_180px]">
                <span className={labelClassName}>{t('products.status')}</span>
                <FilterSelect
                  value={brandActiveFilter}
                  options={activeFilterOptions}
                  onChange={(value) => setBrandActiveFilter(value as ActiveFilter)}
                  disabled={isBrandsLoading}
                />
              </label>

              <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_200px]">
                <span className={labelClassName}>{t('products.orderBy')}</span>
                <FilterSelect
                  value={brandOrdering}
                  options={brandOrderingOptions}
                  onChange={(value) => setBrandOrdering(value as BrandOrdering)}
                  disabled={isBrandsLoading}
                />
              </label>
            </>
          )}
        </FilterBar>

        <PageCard>
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="inline-flex items-center rounded-xl bg-surface-subtle/80 p-1 ring-1 ring-border-soft/45">
                <button
                  type="button"
                  className={[
                    'rounded-lg px-3 py-1.5 text-sm font-semibold transition duration-fast',
                    catalogView === 'products'
                      ? 'bg-surface-card text-text-primary shadow-sm ring-1 ring-border-soft/45'
                      : 'text-text-secondary hover:text-text-primary',
                  ].join(' ')}
                  onClick={() => setCatalogView('products')}
                >
                  {t('products.catalogTitle')}
                </button>
                <button
                  type="button"
                  className={[
                    'rounded-lg px-3 py-1.5 text-sm font-semibold transition duration-fast',
                    catalogView === 'categories'
                      ? 'bg-surface-card text-text-primary shadow-sm ring-1 ring-border-soft/45'
                      : 'text-text-secondary hover:text-text-primary',
                  ].join(' ')}
                  onClick={() => setCatalogView('categories')}
                >
                  {t('products.categoriesCatalogTitle')}
                </button>
                <button
                  type="button"
                  className={[
                    'rounded-lg px-3 py-1.5 text-sm font-semibold transition duration-fast',
                    catalogView === 'brands'
                      ? 'bg-surface-card text-text-primary shadow-sm ring-1 ring-border-soft/45'
                      : 'text-text-secondary hover:text-text-primary',
                  ].join(' ')}
                  onClick={() => setCatalogView('brands')}
                >
                  {t('products.brandsCatalogTitle', { defaultValue: 'Brendlar' })}
                </button>
                <button
                  type="button"
                  className={[
                    'rounded-lg px-3 py-1.5 text-sm font-semibold transition duration-fast',
                    catalogView === 'promoted'
                      ? 'bg-surface-card text-text-primary shadow-sm ring-1 ring-border-soft/45'
                      : 'text-text-secondary hover:text-text-primary',
                  ].join(' ')}
                  onClick={() => setCatalogView('promoted')}
                >
                  {t('products.promotedCatalogTitle')}
                </button>
              </div>
              <span className="text-[12px] font-medium text-text-muted">
                {catalogView === 'categories'
                  ? t('products.categoriesCatalogHint')
                  : catalogView === 'promoted'
                    ? t('products.promotedCatalogHint')
                    : catalogView === 'brands'
                      ? t('products.brandsCatalogHint', { defaultValue: 'Brendlarni boshqarish' })
                      : t('products.catalogHint')}
              </span>
            </div>

            {catalogView === 'products' || catalogView === 'promoted' ? (
            <DataTable
              data={products}
              columns={productColumns}
              rowKey="id"
              selectedRowKey={selectedProductId}
              getRowClassName={(product) =>
                isProductAtMinimalStock(product) ? warningRowClassName : ''
              }
              loading={isLoading}
              onRowClick={(product) => setSelectedProductId(product.id)}
              emptyTitle={t('products.emptyTitle')}
                emptyDescription={t('products.emptyDescription')}
              />
            ) : catalogView === 'categories' ? (
              <DataTable
                data={categories}
                columns={categoryColumns}
                rowKey="id"
                loading={isCategoriesLoading}
                emptyTitle={
                  categoryHasError
                    ? t('products.categoriesErrorTitle')
                    : t('products.categoriesEmptyTitle')
                }
                emptyDescription={
                  categoryHasError
                    ? t('products.categoriesErrorDescription')
                    : t('products.categoriesEmptyDescription')
                }
              />
            ) : (
              <DataTable
                data={brands}
                columns={brandColumns}
                rowKey="id"
                loading={isBrandsLoading}
                emptyTitle={
                  brandHasError
                    ? t('products.brandsErrorTitle', { defaultValue: 'Brendlarni yuklashda xatolik' })
                    : t('products.brandsEmptyTitle', { defaultValue: 'Brendlar mavjud emas' })
                }
                emptyDescription={
                  brandHasError
                    ? t('products.brandsErrorDescription', { defaultValue: 'Iltimos, sahifani yangilab ko\'ring.' })
                    : t('products.brandsEmptyDescription', { defaultValue: 'Hali birorta ham brend qo\'shilmagan.' })
                }
              />
            )}
          </div>
        </PageCard>

        {catalogView !== 'categories' && !isLoading && paginationMeta.totalItems > 0 ? (
          <Pagination
            currentPage={Math.min(currentPage, paginationMeta.totalPages)}
            totalPages={paginationMeta.totalPages}
            totalItems={paginationMeta.totalItems}
            onPageChange={setCurrentPage}
          />
        ) : null}

        {catalogView === 'categories' &&
        !isCategoriesLoading &&
        categoryPaginationMeta.totalItems > 0 ? (
          <Pagination
            currentPage={Math.min(categoryCurrentPage, categoryPaginationMeta.totalPages)}
            totalPages={categoryPaginationMeta.totalPages}
            totalItems={categoryPaginationMeta.totalItems}
            onPageChange={setCategoryCurrentPage}
          />
        ) : null}

        {catalogView === 'brands' &&
        !isBrandsLoading &&
        brandPaginationMeta.totalItems > 0 ? (
          <Pagination
            currentPage={Math.min(brandCurrentPage, brandPaginationMeta.totalPages)}
            totalPages={brandPaginationMeta.totalPages}
            totalItems={brandPaginationMeta.totalItems}
            onPageChange={setBrandCurrentPage}
          />
        ) : null}
      </PageSection>

      {catalogView !== 'categories' && selectedProductId ? (
        <ProductDetailPanel
          productId={selectedProductId}
          isDeleteDisabled={isDeleteBlocked(selectedProductId)}
          deleteDisabledReason={getDeleteBlockReason(selectedProductId)}
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
          categoryOptions={categoryOptions}
          isCategoryOptionsLoading={isCategoryOptionsLoading}
          brandOptions={brandOptions}
          isBrandOptionsLoading={isBrandOptionsLoading}
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

      {isCategoryFormOpen ? (
        <ProductCategoryFormDialog
          mode={categoryFormMode}
          category={editingCategory}
          isSubmitting={isCategorySaving}
          errorMessage={categoryErrorMessage}
          onClose={() => {
            if (!isCategorySaving) {
              setIsCategoryFormOpen(false);
              setEditingCategory(null);
              setCategoryErrorMessage(null);
            }
          }}
          onSubmit={(payload) => {
            void handleSaveCategory(payload);
          }}
        />
      ) : null}

      {categoryToDelete ? (
        <ProductCategoryDeleteDialog
          category={categoryToDelete}
          isDeleting={isCategoryDeleting}
          onCancel={() => {
            if (!isCategoryDeleting) {
              setCategoryToDelete(null);
            }
          }}
          onConfirm={() => {
            void handleConfirmCategoryDelete();
          }}
        />
      ) : null}

      {productToDelete ? (
        <ProductDeleteDialog
          product={productToDelete}
          isDeleting={isDeleting}
          isConfirmDisabled={isDeleteConfirmDisabled}
          errorMessage={deleteErrorMessage}
          onCancel={() => {
            if (!isDeleting) {
              setDeleteErrorMessage(null);
              setIsDeleteConfirmDisabled(false);
              setProductToDelete(null);
            }
          }}
          onConfirm={() => {
            void handleConfirmDelete();
          }}
        />
      ) : null}
      {isBrandFormOpen ? (
        <ProductBrandFormDialog
          mode={brandFormMode}
          brand={editingBrand}
          isSubmitting={isBrandSaving}
          errorMessage={brandErrorMessage}
          onClose={() => {
            if (!isBrandSaving) {
              setIsBrandFormOpen(false);
              setEditingBrand(null);
              setBrandErrorMessage(null);
            }
          }}
          onSubmit={(payload) => {
            void handleSaveBrand(payload);
          }}
        />
      ) : null}

      {brandToDelete ? (
        <ProductBrandDeleteDialog
          brand={brandToDelete}
          isDeleting={isBrandDeleting}
          onCancel={() => setBrandToDelete(null)}
          onConfirm={() => {
            void handleConfirmBrandDelete();
          }}
        />
      ) : null}
    </PageLayout>
  );
}

export default ProductsPage;
