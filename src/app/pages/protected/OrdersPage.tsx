import { useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
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
import OrderDetailPanel from '../../../features/orders/components/OrderDetailPanel';
import OrderFormPanel from '../../../features/orders/components/OrderFormPanel';
import { formatLocalizedDate } from '../../../i18n/date-format';
import { getChannelLabel, getOrderStatusLabel } from '../../../i18n/labels';
import { services } from '../../../services';
import type {
  Customer,
  EntityId,
  Lead,
  Order,
  OrderMutationInput,
  OrderSource,
  OrderStatus,
  PaginationMeta,
  Product,
  SelectOption,
  TableQueryParams,
} from '../../../types/domain';

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
const ALL_STATUS_VALUE = 'all';
const ALL_SOURCE_VALUE = 'all';
const ALL_AI_VALUE = 'all';
const DEFAULT_ORDERING: OrderOrdering = '-updated_at';

const ORDER_SOURCES: readonly OrderSource[] = ['telegram', 'instagram', 'manual'];

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
    order.lead?.fullName?.trim() ||
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

  const [search, setSearch] = useState('');
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

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, sourceFilter, aiFilter, ordering]);

  useEffect(() => {
    let isActive = true;

    async function loadFormReferences() {
      try {
        const [customersResponse, leadsResponse, productsResponse] = await Promise.all([
          services.customers.list({
            page: 1,
            pageSize: SERVICE_FETCH_SIZE,
            ordering: '-updated_at',
          }),
          services.leads.list({
            page: 1,
            pageSize: SERVICE_FETCH_SIZE,
          }),
          services.products.list({
            page: 1,
            pageSize: SERVICE_FETCH_SIZE,
            ordering: 'name',
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
        setLeads(
          [...leadsResponse.items].sort((left, right) =>
            left.fullName.localeCompare(right.fullName),
          ),
        );
        setProducts(productsResponse.items);
      } catch {
        if (!isActive) {
          return;
        }

        setCustomers([]);
        setLeads([]);
        setProducts([]);
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
          search,
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
  }, [aiFilter, currentPage, ordering, reloadCursor, search, sourceFilter, statusFilter]);

  useEffect(() => {
    if (!selectedOrderId) {
      return;
    }

    const selectedVisible = orders.some((order) => order.id === selectedOrderId);
    if (!selectedVisible) {
      setSelectedOrderId(null);
    }
  }, [orders, selectedOrderId]);

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
      const message =
        error instanceof Error ? error.message : t('orders.form.saveError');
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

  async function handleRecalculate(
    orderId: EntityId,
    payload?: OrderMutationInput,
  ): Promise<Order | null> {
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
  }

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
              {order.customer?.fullName ?? order.contactName}
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

  const activeFilterCount =
    Number(statusFilter !== ALL_STATUS_VALUE) +
    Number(sourceFilter !== ALL_SOURCE_VALUE) +
    Number(aiFilter !== ALL_AI_VALUE) +
    Number(ordering !== DEFAULT_ORDERING);

  const header = (
    <PageHeader
      eyebrow={t('orders.title')}
      title={t('orders.title')}
      subtitle={t('orders.subtitle')}
      actions={
        <div className="flex w-full flex-wrap items-center gap-2 min-[768px]:w-auto">
          <button
            type="button"
            className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            onClick={openCreateForm}
          >
            <AppIcon name="plus" className="h-4 w-4" aria-hidden="true" />
            {t('orders.newOrder')}
          </button>
          <span className="inline-flex min-h-8 items-center gap-2 rounded-pill bg-primary/12 px-3 text-[12px] font-semibold text-text-accent">
            <AppIcon name="orders" className="h-3.5 w-3.5" aria-hidden="true" />
            {paginationMeta.totalItems} {t('orders.title').toLowerCase()}
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
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t('orders.searchPlaceholder')}
            disabled={isLoading}
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
        </FilterBar>

        <PageCard>
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <h2 className="m-0 text-[1rem] font-semibold text-text-primary">
                {t('orders.boardTitle')}
              </h2>
              <span className="text-[12px] font-medium text-text-muted">
                {t('orders.boardHint')}
              </span>
            </div>

            <DataTable
              data={orders}
              columns={columns}
              rowKey="id"
              selectedRowKey={selectedOrderId}
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
          order={editingOrder}
          customers={customers}
          leads={leads}
          products={products}
          statusOptions={statusOptions.filter(
            (option) => option.value !== ALL_STATUS_VALUE,
          )}
          sourceOptions={sourceOptions.filter(
            (option) => option.value !== ALL_SOURCE_VALUE,
          )}
          isSubmitting={isSaving}
          errorMessage={formErrorMessage}
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
    </PageLayout>
  );
}

export default OrdersPage;
