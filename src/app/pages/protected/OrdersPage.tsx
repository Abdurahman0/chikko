import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatCurrencyAmount } from '../../../constants';
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
import { ORDER_STATUSES } from '../../../constants';
import OrderDeleteDialog from '../../../features/orders/components/OrderDeleteDialog';
import ReviewDeleteDialog from '../../../features/orders/components/ReviewDeleteDialog';
import ReviewDetailPanel from '../../../features/orders/components/ReviewDetailPanel';
import OrderDetailPanel from '../../../features/orders/components/OrderDetailPanel';
import OrderFormPanel from '../../../features/orders/components/OrderFormPanel';
import { formatLocalizedDate } from '../../../i18n/date-format';
import { getChannelLabel, getOrderStatusLabel } from '../../../i18n/labels';
import { usePersistentState } from '../../../lib/persistent-state';
import { services } from '../../../services';
import type {
  Customer,
  Lead,
  EntityId,
  Order,
  OrderMutationInput,
  OrderSource,
  OrderStatus,
  PaginationMeta,
  Product,
  SelectOption,
  TableQueryParams,
} from '../../../types/domain';
import type { 
  OrderReview, 
  OrderReviewListParams,
} from '../../../types/order';

type OrdersView = 'orders' | 'reviews';
type AiFilter = 'all' | 'yes' | 'no';
type OrderOrdering =
  | '-updated_at'
  | 'updated_at'
  | '-created_at'
  | 'created_at'
  | '-total_amount'
  | 'total_amount';

const PAGE_SIZE = 8;
const SERVICE_FETCH_SIZE = 400;
const SEARCH_DEBOUNCE_MS = 350;
const ALL_STATUS_VALUE = 'all';
const ALL_SOURCE_VALUE = 'all';
const ALL_AI_VALUE = 'all';
const DEFAULT_ORDERING: OrderOrdering = '-updated_at';
const DEFAULT_REVIEW_ORDERING = '-submitted_at';

const ORDER_SOURCES: readonly OrderSource[] = ['manual', 'telegram', 'instagram'];

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

function parseOrdering(ordering: OrderOrdering): Pick<
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

function resolveAiGeneratedFilter(value: AiFilter): boolean | undefined {
  if (value === 'all') {
    return undefined;
  }

  return value === 'yes';
}

function asRecord(value: unknown): Record<string, unknown> | null {
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

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => readMessage(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function localizeInsufficientStockMessage(
  message: string,
  language: string,
): string | null {
  const match =
    /^Insufficient stock for\s+(.+?)\.\s*Available:\s*([^.\s][^.]*)\.?$/i.exec(message);
  if (!match) {
    return null;
  }

  const productName = match[1]?.trim();
  const availableQuantity = match[2]?.trim();

  if (!productName || !availableQuantity) {
    return null;
  }

  if (language === 'ru') {
    return `Недостаточно остатков для ${productName}. Доступно: ${availableQuantity}.`;
  }

  return `${productName} uchun zaxira yetarli emas. Mavjud: ${availableQuantity}.`;
}

function extractOrderSaveErrorMessage(
  error: unknown,
  fallback: string,
  language: string,
): string {
  const topLevel = asRecord(error);
  const response = asRecord(topLevel?.response);
  const data = response?.data;
  const dataRecord = asRecord(data);

  const messages: string[] = [
    ...readStringList(dataRecord?.items),
    ...readStringList(dataRecord?.non_field_errors),
    ...readStringList(dataRecord?.errors),
  ];

  const directCandidates: Array<unknown> = [
    dataRecord?.detail,
    dataRecord?.message,
    dataRecord?.error,
    Array.isArray(data) ? data[0] : null,
    data,
    topLevel?.message,
  ];

  for (const candidate of directCandidates) {
    const message = readMessage(candidate);
    if (message) {
      messages.push(message);
    }
  }

  for (const message of messages) {
    const localizedStockMessage = localizeInsufficientStockMessage(message, language);
    if (localizedStockMessage) {
      return localizedStockMessage;
    }

    if (message) {
      return message;
    }
  }

  return fallback;
}

function formatOrderLabel(order: Order): string {
  const firstItemProductName = order.items[0]?.product?.name?.trim() ?? '';
  if (firstItemProductName) {
    return firstItemProductName;
  }

  const normalizedOrderNumber = order.orderNumber?.trim() ?? '';
  if (
    normalizedOrderNumber &&
    !/^#?[0-9a-f]{6,}$/i.test(normalizedOrderNumber) &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      normalizedOrderNumber,
    )
  ) {
    return normalizedOrderNumber;
  }

  return (
    order.contactName?.trim() ||
    order.customer?.fullName?.trim() ||
    'Buyurtma'
  );
}

function getSourceBadgeClassName(source: OrderSource): string {
  if (source === 'telegram') {
    return 'bg-[rgb(32_156_238_/_0.14)] text-[rgb(12_114_181)]';
  }

  if (source === 'instagram') {
    return 'bg-[rgb(225_48_108_/_0.14)] text-[rgb(176_32_87)]';
  }

  return 'bg-surface-subtle text-text-secondary';
}

function OrdersPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';
  const navigate = useNavigate();

  const [search, setSearch] = usePersistentState('orders:search', '');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUS_VALUE);
  const [sourceFilter, setSourceFilter] = useState<string>(ALL_SOURCE_VALUE);
  const [aiFilter, setAiFilter] = useState<AiFilter>('all');
  const [ordering, setOrdering] = useState<OrderOrdering>(DEFAULT_ORDERING);
  const [currentPage, setCurrentPage] = useState(1);

  const [orders, setOrders] = useState<Order[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>(
    DEFAULT_PAGINATION_META,
  );

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [selectedOrderId, setSelectedOrderId] = useState<EntityId | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [reloadCursor, setReloadCursor] = useState(0);
  const [detailRefreshToken, setDetailRefreshToken] = useState(0);
  const [recalculatingOrderId, setRecalculatingOrderId] = useState<EntityId | null>(
    null,
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);

  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [currentView, setCurrentView] = usePersistentState<OrdersView>(
    'orders:view',
    'orders',
  );

  // Review states
  const [reviews, setReviews] = useState<OrderReview[]>([]);
  const [reviewPagination, setReviewPagination] = useState<PaginationMeta>(
    DEFAULT_PAGINATION_META,
  );
  const [reviewSearch, setReviewSearch] = usePersistentState('orders:reviews:search', '');
  const [reviewDebouncedSearch, setReviewDebouncedSearch] = useState('');
  const [reviewSourceFilter, setReviewSourceFilter] = useState<string>(ALL_SOURCE_VALUE);
  const [reviewOrdering, setReviewOrdering] = useState<string>(DEFAULT_REVIEW_ORDERING);
  const [currentReviewPage, setCurrentReviewPage] = useState(1);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<OrderReview | null>(null);
  const [selectedReviewId, setSelectedReviewId] = useState<EntityId | null>(null);

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
      setReviewDebouncedSearch(reviewSearch.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [reviewSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, sourceFilter, aiFilter, ordering]);

  useEffect(() => {
    let isActive = true;

    async function loadFormReferences() {
      try {
        const [customersResponse, productsResponse, leadsResponse] = await Promise.all([
          services.customers.list({
            page: 1,
            pageSize: SERVICE_FETCH_SIZE,
            ordering: '-updated_at',
          }),
          services.products.list({
            page: 1,
            pageSize: SERVICE_FETCH_SIZE,
            ordering: 'name',
          }),
          services.leads.list({
            page: 1,
            pageSize: SERVICE_FETCH_SIZE,
            ordering: '-updated_at',
          }),
        ]);

        if (!isActive) {
          return;
        }

        setCustomers(
          [...customersResponse.items].sort((left, right) =>
            left.fullName.localeCompare(right.fullName),
          ),
        );
        setProducts(productsResponse.items);
        setLeads(leadsResponse.items);
      } catch {
        if (!isActive) {
          return;
        }

        setCustomers([]);
        setProducts([]);
        setLeads([]);
      }
    }

    void loadFormReferences();

    return () => {
      isActive = false;
    };
  }, [reloadCursor]);

  useEffect(() => {
    let isActive = true;

    async function loadOrders() {
      setIsLoading(true);
      setHasError(false);

      try {
        const sortConfig = parseOrdering(ordering);
        const result = await services.orders.list({
          page: currentPage,
          pageSize: PAGE_SIZE,
          search: debouncedSearch || undefined,
          status: statusFilter === ALL_STATUS_VALUE ? undefined : statusFilter,
          source: sourceFilter === ALL_SOURCE_VALUE ? undefined : sourceFilter,
          ai_generated: resolveAiGeneratedFilter(aiFilter),
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

        setOrders(result.items);
        setPaginationMeta(result.meta);
      } catch {
        if (!isActive) {
          return;
        }

        setHasError(true);
        setOrders([]);
        setPaginationMeta(DEFAULT_PAGINATION_META);
      } finally {
        if (isActive) {
          setHasLoadedOnce(true);
          setIsLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      isActive = false;
    };
  }, [
    aiFilter,
    currentPage,
    debouncedSearch,
    ordering,
    reloadCursor,
    sourceFilter,
    statusFilter,
  ]);

  useEffect(() => {
    if (!selectedOrderId) {
      return;
    }

    const selectedVisible = orders.some((order) => order.id === selectedOrderId);
    if (!selectedVisible) {
      setSelectedOrderId(null);
    }
  }, [orders, selectedOrderId]);

  useEffect(() => {
    if (currentView !== 'reviews') return;

    let isActive = true;

    async function loadReviews() {
      setIsReviewLoading(true);
      try {
        const result = await services.orders.listOrderReviews({
          page: currentReviewPage,
          pageSize: PAGE_SIZE,
          search: reviewDebouncedSearch || undefined,
          source: reviewSourceFilter === ALL_SOURCE_VALUE ? undefined : reviewSourceFilter,
          ordering: reviewOrdering,
        });

        if (!isActive) return;

        setReviews(result.items);
        setReviewPagination(result.meta);
      } catch {
        if (!isActive) return;
        setReviews([]);
      } finally {
        if (isActive) setIsReviewLoading(false);
      }
    }

    void loadReviews();

    return () => {
      isActive = false;
    };
  }, [
    currentView,
    currentReviewPage,
    reviewDebouncedSearch,
    reviewSourceFilter,
    reviewOrdering,
    reloadCursor,
  ]);

  function openCreateForm() {
    setFormMode('create');
    setEditingOrder(null);
    setFormErrorMessage(null);
    setIsFormOpen(true);
  }

  function openEditForm(order: Order) {
    setFormMode('edit');
    setEditingOrder(order);
    setFormErrorMessage(null);
    setIsFormOpen(true);
  }

  function requestDelete(order: Order) {
    setOrderToDelete(order);
  }

  async function handleSaveOrder(payload: OrderMutationInput) {
    setIsSaving(true);
    setFormErrorMessage(null);

    try {
      let savedOrder: Order | null = null;

      if (formMode === 'create') {
        savedOrder = await services.orders.create(payload);
      } else {
        const editId = editingOrder?.id;
        if (!editId) {
          throw new Error(t('orders.form.saveError'));
        }

        const updated = await services.orders.patch(editId, payload);
        if (!updated) {
          throw new Error(t('orders.form.saveError'));
        }

        savedOrder = updated;
      }

      if (savedOrder && formMode === 'edit') {
        const nextSavedOrder = savedOrder;
        setOrders((current) =>
          current.map((entry) =>
            entry.id === nextSavedOrder.id ? nextSavedOrder : entry,
          ),
        );
      }

      setIsFormOpen(false);
      setEditingOrder(null);
      setReloadCursor((current) => current + 1);
      setDetailRefreshToken((current) => current + 1);
    } catch (error) {
      const message = extractOrderSaveErrorMessage(
        error,
        t('orders.form.saveError'),
        i18n.language,
      );
      setFormErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!orderToDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      const deleted = await services.orders.delete(orderToDelete.id);
      if (!deleted) {
        throw new Error();
      }

      if (selectedOrderId === orderToDelete.id) {
        setSelectedOrderId(null);
      }

      setOrderToDelete(null);
      setReloadCursor((current) => current + 1);
    } catch {
      // Keep the dialog open if deletion fails.
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleConfirmDeleteReview() {
    if (!reviewToDelete) return;
    setIsDeleting(true);

    try {
      await services.orders.deleteOrderReview(reviewToDelete.id);
      setReviewToDelete(null);
      setReloadCursor((current) => current + 1);
    } catch {
      // Error handling
    } finally {
      setIsDeleting(false);
    }
  }

  const handleRecalculate = useCallback(async (
    orderId: EntityId,
    payload?: OrderMutationInput,
  ): Promise<Order | null> => {
    if (!payload) {
      setRecalculatingOrderId(orderId);
    }

    try {
      const updated = await services.orders.recalculate(orderId, payload);
      if (!updated) {
        throw new Error('Order not found');
      }

      setOrders((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );

      if (!payload) {
        setReloadCursor((current) => current + 1);
        setDetailRefreshToken((current) => current + 1);
      }

      return updated;
    } finally {
      if (!payload) {
        setRecalculatingOrderId(null);
      }
    }
  }, []);

  const statusOptions = useMemo<SelectOption[]>(
    () => [
      { value: ALL_STATUS_VALUE, label: t('orders.allStatuses') },
      ...ORDER_STATUSES.map((status) => ({
        value: status,
        label: getOrderStatusLabel(t, status),
      })),
    ],
    [t],
  );

  const sourceOptions = useMemo<SelectOption[]>(
    () => [
      { value: ALL_SOURCE_VALUE, label: t('orders.allSources') },
      ...ORDER_SOURCES.map((source) => ({
        value: source,
        label: getChannelLabel(t, source),
      })),
    ],
    [t],
  );

  const aiFilterOptions = useMemo<SelectOption[]>(
    () => [
      { value: ALL_AI_VALUE, label: t('orders.aiAll') },
      { value: 'yes', label: t('orders.aiYes') },
      { value: 'no', label: t('orders.aiNo') },
    ],
    [t],
  );

  const orderingOptions = useMemo<SelectOption[]>(
    () => [
      { value: '-updated_at', label: t('orders.updatedNewest') },
      { value: 'updated_at', label: t('orders.updatedOldest') },
      { value: '-created_at', label: t('orders.createdNewest') },
      { value: 'created_at', label: t('orders.createdOldest') },
      { value: '-total_amount', label: t('orders.totalHighLow') },
      { value: 'total_amount', label: t('orders.totalLowHigh') },
    ],
    [t],
  );

  const reviewSourceOptions = useMemo<SelectOption[]>(
    () => [
      { value: ALL_SOURCE_VALUE, label: t('orders.allSources') },
      ...ORDER_SOURCES.map((source) => ({
        value: source,
        label: getChannelLabel(t, source),
      })),
    ],
    [t],
  );

  const reviewOrderingOptions = useMemo<SelectOption[]>(
    () => [
      { value: '-submitted_at', label: t('orders.reviews.submittedNewest') },
      { value: 'submitted_at', label: t('orders.reviews.submittedOldest') },
    ],
    [t],
  );

  const columns = useMemo<DataTableColumn<Order>[]>(() => {
    return [
      {
        key: 'order',
        label: t('orders.columns.order'),
        render: (order) => (
          <div className="grid gap-0.5">
            <span className={tablePrimaryTextClassName}>
              {formatOrderLabel(order)}
            </span>
            <span className={tableSecondaryTextClassName}>
              {order.items.length} {t('orders.itemsSuffix')}
            </span>
          </div>
        ),
      },
      {
        key: 'customerContact',
        label: t('orders.columns.customerContact'),
        render: (order) => (
          <div className="grid gap-0.5">
            <span className={tablePrimaryTextClassName}>
              {order.customer ? (
                order.customer.fullName
              ) : order.lead ? (
                `${order.lead.fullName} (Lead)`
              ) : (
                order.contactName || t('common.na')
              )}
            </span>
            <span className={tableSecondaryTextClassName}>
              {order.contactPhone}
            </span>
          </div>
        ),
      },
      {
        key: 'source',
        label: t('orders.columns.source'),
        render: (order) => (
          <span
            className={[
              'inline-flex min-h-7 items-center rounded-pill px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em]',
              getSourceBadgeClassName(order.source),
            ].join(' ')}
          >
            {getChannelLabel(t, order.source)}
          </span>
        ),
      },
      {
        key: 'status',
        label: t('orders.columns.status'),
        render: (order) => (
          <StatusBadge
            status={order.status}
            label={getOrderStatusLabel(t, order.status)}
          />
        ),
      },
      {
        key: 'totalAmount',
        label: t('orders.columns.totalAmount'),
        render: (order) => (
          <span className={tablePrimaryTextClassName}>
            {formatCurrencyAmount(order.totalAmount, locale)}
          </span>
        ),
      },
      {
        key: 'aiGenerated',
        label: t('orders.columns.aiGenerated'),
        render: (order) => (
          <StatusBadge
            status={order.aiGenerated ? 'active' : 'inactive'}
            tone={order.aiGenerated ? 'info' : 'neutral'}
            label={order.aiGenerated ? t('orders.aiYes') : t('orders.aiNo')}
          />
        ),
      },
      {
        key: 'updatedAt',
        label: t('orders.columns.updated'),
        render: (order) => (
          <span className={tablePrimaryTextClassName}>
            {formatLocalizedDate(order.updatedAt, i18n.language, {
              locale,
              withYear: true,
              shortMonth: true,
              fallback: t('common.na'),
            })}
          </span>
        ),
      },
      {
        key: 'actions',
        label: t('orders.columns.actions'),
        align: 'right',
        render: (order) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              className={actionButtonClassName}
              onClick={(event) => {
                event.stopPropagation();
                openEditForm(order);
              }}
              aria-label={`${t('orders.actions.edit')} ${formatOrderLabel(order)}`}
            >
              <FiEdit2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className={actionButtonClassName}
              onClick={(event) => {
                event.stopPropagation();
                requestDelete(order);
              }}
              aria-label={`${t('orders.actions.delete')} ${formatOrderLabel(order)}`}
            >
              <FiTrash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      },
    ];
  }, [i18n.language, locale, t]);

  const reviewColumns = useMemo<DataTableColumn<OrderReview>[]>(() => {
    return [
      {
        key: 'reviewer',
        label: t('orders.reviews.columns.reviewer'),
        render: (review) => {
          const customerName = review.customer ? (customers.find(c => c.id === review.customer)?.fullName || review.customer) : null;
          const leadName = review.lead ? (leads.find(l => l.id === review.lead)?.fullName || review.lead) : null;

          return (
            <div className="grid gap-0.5">
              <span className={tablePrimaryTextClassName}>
                {review.orderDetail.contactName || t('common.na')}
              </span>
              <span className={tableSecondaryTextClassName}>
                {review.customer ? (
                  customerName
                ) : review.lead ? (
                  `${leadName} (Lead)`
                ) : (
                  t('common.na')
                )}
              </span>
            </div>
          );
        },
      },
      {
        key: 'comment',
        label: t('orders.reviews.columns.comment'),
        render: (review) => (
          <span className="block max-w-[300px] truncate text-sm text-text-primary">
            {review.comment}
          </span>
        ),
      },
      {
        key: 'source',
        label: t('orders.reviews.columns.source'),
        render: (review) => (
          <span
            className={[
              'inline-flex min-h-7 items-center rounded-pill px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em]',
              getSourceBadgeClassName(review.source as OrderSource),
            ].join(' ')}
          >
            {getChannelLabel(t, review.source as OrderSource)}
          </span>
        ),
      },
      {
        key: 'submittedAt',
        label: t('orders.reviews.columns.submittedAt'),
        render: (review) => (
          <span className={tablePrimaryTextClassName}>
            {formatLocalizedDate(review.submittedAt, i18n.language, {
              locale,
              withYear: true,
              shortMonth: true,
              fallback: t('common.na'),
            })}
          </span>
        ),
      },
      {
        key: 'actions',
        label: t('orders.reviews.columns.actions'),
        align: 'right',
        render: (review) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              className={actionButtonClassName}
              onClick={(event) => {
                event.stopPropagation();
                setReviewToDelete(review);
              }}
              aria-label={t('orders.reviews.actions.delete')}
            >
              <FiTrash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      },
    ];
  }, [i18n.language, locale, t]);

  const activeFilterCount =
    Number(statusFilter !== ALL_STATUS_VALUE) +
    Number(sourceFilter !== ALL_SOURCE_VALUE) +
    Number(aiFilter !== ALL_AI_VALUE) +
    Number(ordering !== DEFAULT_ORDERING);

  const viewSwitcher = (
    <div className="inline-flex items-center rounded-lg bg-surface-subtle p-1 ring-1 ring-border-soft/40">
      <button
        type="button"
        className={[
          'inline-flex min-h-8 items-center gap-2 rounded-md px-3 text-[12px] font-semibold transition duration-fast',
          currentView === 'orders'
            ? 'bg-surface-card text-text-primary shadow-sm ring-1 ring-border-soft/60'
            : 'text-text-muted hover:text-text-secondary',
        ].join(' ')}
        onClick={() => setCurrentView('orders')}
      >
        {t('orders.views.orders')}
      </button>
      <button
        type="button"
        className={[
          'inline-flex min-h-8 items-center gap-2 rounded-md px-3 text-[12px] font-semibold transition duration-fast',
          currentView === 'reviews'
            ? 'bg-surface-card text-text-primary shadow-sm ring-1 ring-border-soft/60'
            : 'text-text-muted hover:text-text-secondary',
        ].join(' ')}
        onClick={() => setCurrentView('reviews')}
      >
        {t('orders.views.reviews')}
      </button>
    </div>
  );

  const header = (
    <PageHeader
      eyebrow={t('orders.title')}
      title={t('orders.title')}
      subtitle={t('orders.subtitle')}
      actions={
        <div className="flex w-full flex-wrap items-center gap-2 min-[768px]:w-auto">
          {currentView === 'orders' && (
            <button
              type="button"
              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              onClick={openCreateForm}
            >
              <AppIcon name="plus" className="h-4 w-4" aria-hidden="true" />
              {t('orders.newOrder')}
            </button>
          )}
          <span className="inline-flex min-h-8 items-center gap-2 rounded-pill bg-primary/12 px-3 text-[12px] font-semibold text-text-accent">
            <AppIcon
              name={currentView === 'orders' ? 'orders' : 'chat'}
              className="h-3.5 w-3.5"
              aria-hidden="true"
            />
            {currentView === 'orders'
              ? paginationMeta.totalItems
              : reviewPagination.totalItems}{' '}
            {currentView === 'orders'
              ? t('orders.title').toLowerCase()
              : t('orders.views.reviews').toLowerCase()}
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
              title={t('orders.loadingTitle')}
              description={t('orders.loadingDescription')}
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
              title={t('orders.errorTitle')}
              description={t('orders.errorDescription')}
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
                {paginationMeta.totalItems} {t('orders.records')}
              </span>
              {activeFilterCount > 0 ? (
                <span className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary/12 px-3 text-sm font-semibold text-text-accent">
                  <AppIcon name="filter" className="h-4 w-4" aria-hidden="true" />
                  {activeFilterCount} {t('orders.activeFilters')}
                </span>
              ) : null}
              {selectedOrderId ? (
                <span className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-info-bg px-3 text-sm font-semibold text-info">
                  <FiRefreshCw className="h-3.5 w-3.5" />
                  {t('orders.detailOpen')}
                </span>
              ) : null}
            </div>
          }
        >
          {currentView === 'orders' ? (
            <>
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder={t('orders.searchPlaceholder')}
              />

              <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_180px]">
                <span className={labelClassName}>{t('orders.status')}</span>
                <FilterSelect
                  value={statusFilter}
                  options={statusOptions}
                  onChange={setStatusFilter}
                  disabled={isLoading}
                />
              </label>

              <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_180px]">
                <span className={labelClassName}>{t('orders.source')}</span>
                <FilterSelect
                  value={sourceFilter}
                  options={sourceOptions}
                  onChange={setSourceFilter}
                  disabled={isLoading}
                />
              </label>

              <label className="grid min-w-[min(170px,100%)] flex-[1_1_170px] gap-1.5 min-[640px]:flex-[0_1_170px]">
                <span className={labelClassName}>{t('orders.aiGenerated')}</span>
                <FilterSelect
                  value={aiFilter}
                  options={aiFilterOptions}
                  onChange={(value) => setAiFilter(value as AiFilter)}
                  disabled={isLoading}
                />
              </label>

              <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_200px]">
                <span className={labelClassName}>{t('orders.orderBy')}</span>
                <FilterSelect
                  value={ordering}
                  options={orderingOptions}
                  onChange={(value) => setOrdering(value as OrderOrdering)}
                  disabled={isLoading}
                />
              </label>
            </>
          ) : (
            <>
              <SearchInput
                value={reviewSearch}
                onChange={setReviewSearch}
                placeholder={t('orders.reviews.searchPlaceholder')}
              />

              <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_180px]">
                <span className={labelClassName}>{t('orders.source')}</span>
                <FilterSelect
                  value={reviewSourceFilter}
                  options={reviewSourceOptions}
                  onChange={setReviewSourceFilter}
                  disabled={isReviewLoading}
                />
              </label>

              <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_200px]">
                <span className={labelClassName}>{t('orders.orderBy')}</span>
                <FilterSelect
                  value={reviewOrdering}
                  options={reviewOrderingOptions}
                  onChange={setReviewOrdering}
                  disabled={isReviewLoading}
                />
              </label>
            </>
          )}
        </FilterBar>

        {currentView === 'orders' ? (
          <>
            <PageCard>
              <div className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-4 px-1">
                  <div className="flex flex-wrap items-center gap-4">
                    <h2 className="m-0 text-[1rem] font-semibold text-text-primary">
                      {t('orders.boardTitle')}
                    </h2>
                    {viewSwitcher}
                  </div>
                  <span className="text-[12px] font-medium text-text-muted">
                    {t('orders.boardHint')}
                  </span>
                </div>

                <DataTable
                  data={orders}
                  columns={columns}
                  rowKey="id"
                  selectedRowKey={selectedOrderId ?? undefined}
                  loading={isLoading}
                  onRowClick={(order) => setSelectedOrderId(order.id)}
                  emptyTitle={t('orders.emptyTitle')}
                  emptyDescription={t('orders.emptyDescription')}
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
          </>
        ) : (
          <>
            <PageCard>
              <div className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-4 px-1">
                  <div className="flex flex-wrap items-center gap-4">
                    <h2 className="m-0 text-[1rem] font-semibold text-text-primary">
                      {t('orders.reviews.boardTitle')}
                    </h2>
                    {viewSwitcher}
                  </div>
                </div>

                <DataTable
                  data={reviews}
                  columns={reviewColumns}
                  rowKey="id"
                  selectedRowKey={selectedReviewId ?? undefined}
                  loading={isReviewLoading}
                  onRowClick={(review) => setSelectedReviewId(review.id)}
                  emptyTitle={t('orders.reviews.emptyTitle')}
                  emptyDescription={t('orders.reviews.emptyDescription')}
                />
              </div>
            </PageCard>

            {!isReviewLoading && reviewPagination.totalItems > 0 ? (
              <Pagination
                currentPage={Math.min(currentReviewPage, reviewPagination.totalPages)}
                totalPages={reviewPagination.totalPages}
                totalItems={reviewPagination.totalItems}
                onPageChange={setCurrentReviewPage}
              />
            ) : null}
          </>
        )}
      </PageSection>

      {selectedOrderId ? (
        <OrderDetailPanel
          orderId={selectedOrderId}
          refreshToken={detailRefreshToken}
          isRecalculating={recalculatingOrderId === selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onEdit={(order) => {
            openEditForm(order);
            setSelectedOrderId(null);
          }}
          onDelete={(order) => {
            requestDelete(order);
            setSelectedOrderId(null);
          }}
          onRecalculate={handleRecalculate}
        />
      ) : null}

      {isFormOpen ? (
        <OrderFormPanel
          mode={formMode}
          order={editingOrder || undefined}
          customers={customers}
          products={products}
          statusOptions={statusOptions.filter(
            (option) => option.value !== ALL_STATUS_VALUE,
          )}
          sourceOptions={sourceOptions.filter(
            (option) => option.value !== ALL_SOURCE_VALUE,
          )}
          isSubmitting={isSaving}
          errorMessage={formErrorMessage || undefined}
          onClose={() => {
            if (!isSaving) {
              setIsFormOpen(false);
              setEditingOrder(null);
              setFormErrorMessage(null);
            }
          }}
          onSubmit={handleSaveOrder}
          onRecalculate={handleRecalculate}
        />
      ) : null}

      {orderToDelete ? (
        <OrderDeleteDialog
          order={orderToDelete}
          isDeleting={isDeleting}
          onCancel={() => {
            if (!isDeleting) {
              setOrderToDelete(null);
            }
          }}
          onConfirm={() => {
            void handleConfirmDelete();
          }}
        />
      ) : null}

      {reviewToDelete ? (
        <ReviewDeleteDialog
          review={reviewToDelete}
          isDeleting={isDeleting}
          onCancel={() => {
            if (!isDeleting) {
              setReviewToDelete(null);
            }
          }}
          onConfirm={() => {
            void handleConfirmDeleteReview();
          }}
        />
      ) : null}

      {selectedReviewId && (
        <ReviewDetailPanel
          review={reviews.find(r => r.id === selectedReviewId)!}
          onClose={() => setSelectedReviewId(null)}
          customerName={reviews.find(r => r.id === selectedReviewId)?.customer ? customers.find(c => c.id === reviews.find(r => r.id === selectedReviewId)!.customer)?.fullName : undefined}
          leadName={reviews.find(r => r.id === selectedReviewId)?.lead ? leads.find(l => l.id === reviews.find(r => r.id === selectedReviewId)!.lead)?.fullName : undefined}
        />
      )}
    </PageLayout>
  );
}

export default OrdersPage;
