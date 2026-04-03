import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
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
import { formatLocalizedDate } from '../../../i18n/date-format';
import { usePersistentState } from '../../../lib/persistent-state';
import { services } from '../../../services';
import type {
  Courier,
  CourierMutationInput,
  CourierOrder,
  CourierOrderStatus,
  EntityId,
  PaginationMeta,
  SelectOption,
} from '../../../types/domain';
import CourierDeleteDialog from '../../../features/couriers/components/CourierDeleteDialog';
import CourierDetailPanel from '../../../features/couriers/components/CourierDetailPanel';
import CourierFormPanel from '../../../features/couriers/components/CourierFormPanel';
import CourierOrderDetailPanel from '../../../features/couriers/components/CourierOrderDetailPanel';

type ActiveFilter = 'all' | 'active' | 'inactive';
type WorkspaceTab = 'couriers' | 'orders';
type CourierOrdering =
  | '-updated_at'
  | 'updated_at'
  | '-created_at'
  | 'created_at'
  | 'first_name'
  | '-first_name';
type OrderFilter = 'all' | CourierOrderStatus;
type OrderOrdering =
  | '-updated_at'
  | 'updated_at'
  | '-created_at'
  | 'created_at'
  | 'status'
  | '-status';

const PAGE_SIZE = 8;
const DEFAULT_COURIER_ORDERING: CourierOrdering = '-updated_at';
const DEFAULT_ORDER_ORDERING: OrderOrdering = '-updated_at';
const DEFAULT_PAGINATION_META: PaginationMeta = {
  page: 1,
  pageSize: PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
};
const COURIER_ORDER_STATUSES: readonly CourierOrderStatus[] = [
  'pending',
  'assigned',
  'in_transit',
  'delivered',
];

const tablePrimaryTextClassName =
  'block max-w-[140px] truncate text-sm font-semibold leading-[1.35] text-text-primary min-[640px]:max-w-[220px]';
const tableSecondaryTextClassName =
  'block max-w-[140px] truncate text-[12px] leading-[1.45] text-text-secondary min-[640px]:max-w-[220px]';
const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';
const actionButtonClassName =
  'inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface-card text-text-secondary shadow-sm ring-1 ring-border-soft/40 transition duration-fast hover:bg-surface-subtle hover:text-text-primary';

function getCourierName(courier: Courier): string {
  return (
    courier.firstName.trim() ||
    courier.username ||
    courier.telegramUserId ||
    courier.id
  );
}

function getCourierOrderStatusLabel(
  t: ReturnType<typeof useTranslation>['t'],
  status: CourierOrderStatus,
): string {
  return t(`couriers.orderStatus.${status}`, {
    defaultValue:
      status === 'in_transit'
        ? 'In Transit'
        : status.charAt(0).toUpperCase() + status.slice(1),
  });
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function CouriersPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';

  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('couriers');

  const [courierSearch, setCourierSearch] = usePersistentState('couriers:search', '');
  const [courierActiveFilter, setCourierActiveFilter] = useState<ActiveFilter>('all');
  const [courierOrdering, setCourierOrdering] = useState<CourierOrdering>(
    DEFAULT_COURIER_ORDERING,
  );
  const [courierPage, setCourierPage] = useState(1);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [courierPagination, setCourierPagination] = useState<PaginationMeta>(
    DEFAULT_PAGINATION_META,
  );
  const [selectedCourierId, setSelectedCourierId] = useState<EntityId | null>(null);
  const [isCouriersLoading, setIsCouriersLoading] = useState(true);
  const [hasCouriersError, setHasCouriersError] = useState(false);
  const [hasLoadedCouriersOnce, setHasLoadedCouriersOnce] = useState(false);
  const [couriersReloadCursor, setCouriersReloadCursor] = useState(0);
  const [courierDetailRefreshToken, setCourierDetailRefreshToken] = useState(0);

  const [isCourierFormOpen, setIsCourierFormOpen] = useState(false);
  const [courierFormMode, setCourierFormMode] = useState<'create' | 'edit'>(
    'create',
  );
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [isCourierSaving, setIsCourierSaving] = useState(false);
  const [courierFormError, setCourierFormError] = useState<string | null>(null);
  const [courierToDelete, setCourierToDelete] = useState<Courier | null>(null);
  const [isCourierDeleting, setIsCourierDeleting] = useState(false);

  const [allCouriers, setAllCouriers] = useState<Courier[]>([]);
  const [orderSearch, setOrderSearch] = usePersistentState('courier-orders:search', '');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderFilter>('all');
  const [orderCourierFilter, setOrderCourierFilter] = useState<string>('all');
  const [orderOrdering, setOrderOrdering] = useState<OrderOrdering>(
    DEFAULT_ORDER_ORDERING,
  );
  const [orderPage, setOrderPage] = useState(1);
  const [orders, setOrders] = useState<CourierOrder[]>([]);
  const [orderPagination, setOrderPagination] = useState<PaginationMeta>(
    DEFAULT_PAGINATION_META,
  );
  const [selectedOrderId, setSelectedOrderId] = useState<EntityId | null>(null);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [hasOrdersError, setHasOrdersError] = useState(false);
  const [hasLoadedOrdersOnce, setHasLoadedOrdersOnce] = useState(false);
  const [ordersReloadCursor, setOrdersReloadCursor] = useState(0);
  const [orderDetailRefreshToken, setOrderDetailRefreshToken] = useState(0);

  useEffect(() => {
    setCourierPage(1);
  }, [courierSearch, courierActiveFilter, courierOrdering]);

  useEffect(() => {
    setOrderPage(1);
  }, [orderSearch, orderStatusFilter, orderCourierFilter, orderOrdering]);

  useEffect(() => {
    let isActive = true;

    async function loadCouriers() {
      setIsCouriersLoading(true);
      setHasCouriersError(false);

      try {
        const result = await services.couriers.list({
          page: courierPage,
          pageSize: PAGE_SIZE,
          search: courierSearch.trim() || undefined,
          is_active:
            courierActiveFilter === 'all'
              ? undefined
              : courierActiveFilter === 'active',
          ordering: courierOrdering,
        });

        if (!isActive) {
          return;
        }

        if (courierPage > result.meta.totalPages) {
          setCourierPage(result.meta.totalPages);
          return;
        }

        setCouriers(result.items);
        setCourierPagination(result.meta);
      } catch {
        if (!isActive) {
          return;
        }

        setHasCouriersError(true);
        setCouriers([]);
        setCourierPagination(DEFAULT_PAGINATION_META);
      } finally {
        if (isActive) {
          setIsCouriersLoading(false);
          setHasLoadedCouriersOnce(true);
        }
      }
    }

    void loadCouriers();
    return () => {
      isActive = false;
    };
  }, [
    courierPage,
    courierSearch,
    courierActiveFilter,
    courierOrdering,
    couriersReloadCursor,
  ]);

  useEffect(() => {
    let isActive = true;

    async function loadOrderReferences() {
      try {
        const result = await services.couriers.list({
          page: 1,
          pageSize: 400,
          ordering: 'first_name',
        });
        if (!isActive) {
          return;
        }
        setAllCouriers(result.items);
      } catch {
        if (!isActive) {
          return;
        }
        setAllCouriers([]);
      }
    }

    void loadOrderReferences();
    return () => {
      isActive = false;
    };
  }, [couriersReloadCursor]);

  useEffect(() => {
    let isActive = true;

    async function loadOrders() {
      setIsOrdersLoading(true);
      setHasOrdersError(false);
      try {
        const result = await services.couriers.listOrders({
          page: orderPage,
          pageSize: PAGE_SIZE,
          search: orderSearch.trim() || undefined,
          courier: orderCourierFilter === 'all' ? undefined : orderCourierFilter,
          status: orderStatusFilter === 'all' ? undefined : orderStatusFilter,
          ordering: orderOrdering,
        });

        if (!isActive) {
          return;
        }

        if (orderPage > result.meta.totalPages) {
          setOrderPage(result.meta.totalPages);
          return;
        }

        setOrders(result.items);
        setOrderPagination(result.meta);
      } catch {
        if (!isActive) {
          return;
        }
        setHasOrdersError(true);
        setOrders([]);
        setOrderPagination(DEFAULT_PAGINATION_META);
      } finally {
        if (isActive) {
          setIsOrdersLoading(false);
          setHasLoadedOrdersOnce(true);
        }
      }
    }

    void loadOrders();
    return () => {
      isActive = false;
    };
  }, [
    orderPage,
    orderSearch,
    orderStatusFilter,
    orderCourierFilter,
    orderOrdering,
    ordersReloadCursor,
  ]);

  useEffect(() => {
    if (selectedCourierId && !couriers.some((entry) => entry.id === selectedCourierId)) {
      setSelectedCourierId(null);
    }
  }, [couriers, selectedCourierId]);

  useEffect(() => {
    if (selectedOrderId && !orders.some((entry) => entry.id === selectedOrderId)) {
      setSelectedOrderId(null);
    }
  }, [orders, selectedOrderId]);

  async function handleSaveCourier(payload: CourierMutationInput) {
    setIsCourierSaving(true);
    setCourierFormError(null);
    try {
      if (courierFormMode === 'create') {
        await services.couriers.create(payload);
        setCourierPage(1);
      } else {
        const editId = editingCourier?.id;
        if (!editId) {
          throw new Error(t('couriers.form.saveError'));
        }

        const updated = await services.couriers.update(editId, payload);
        if (!updated) {
          throw new Error(t('couriers.form.saveError'));
        }
      }

      setIsCourierFormOpen(false);
      setEditingCourier(null);
      setCouriersReloadCursor((current) => current + 1);
      setCourierDetailRefreshToken((current) => current + 1);
      setOrdersReloadCursor((current) => current + 1);
    } catch (error) {
      setCourierFormError(extractErrorMessage(error, t('couriers.form.saveError')));
    } finally {
      setIsCourierSaving(false);
    }
  }

  async function handleConfirmDeleteCourier() {
    if (!courierToDelete) {
      return;
    }

    setIsCourierDeleting(true);
    try {
      await services.couriers.delete(courierToDelete.id);
      setCourierToDelete(null);
      setCouriersReloadCursor((current) => current + 1);
      setOrdersReloadCursor((current) => current + 1);
      if (selectedCourierId === courierToDelete.id) {
        setSelectedCourierId(null);
      }
    } finally {
      setIsCourierDeleting(false);
    }
  }

  const handleToggleCourierActive = useCallback(
    async (courier: Courier): Promise<Courier | null> => {
      const updated = await services.couriers.patch(courier.id, {
        isActive: !courier.isActive,
      });

      if (!updated) {
        return null;
      }

      setCouriers((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
      setCouriersReloadCursor((current) => current + 1);
      setOrdersReloadCursor((current) => current + 1);

      return updated;
    },
    [],
  );

  const handleOrderUpdated = useCallback((updated: CourierOrder) => {
    setOrders((current) =>
      current.map((entry) => (entry.id === updated.id ? updated : entry)),
    );
    setOrdersReloadCursor((current) => current + 1);
    setOrderDetailRefreshToken((current) => current + 1);
  }, []);

  const activeOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'all', label: t('couriers.status.all') },
      { value: 'active', label: t('couriers.status.active') },
      { value: 'inactive', label: t('couriers.status.inactive') },
    ],
    [t],
  );

  const courierOrderingOptions = useMemo<SelectOption[]>(
    () => [
      { value: '-updated_at', label: t('couriers.ordering.updatedNewest') },
      { value: 'updated_at', label: t('couriers.ordering.updatedOldest') },
      { value: '-created_at', label: t('couriers.ordering.createdNewest') },
      { value: 'created_at', label: t('couriers.ordering.createdOldest') },
      { value: 'first_name', label: t('couriers.ordering.nameAsc') },
      { value: '-first_name', label: t('couriers.ordering.nameDesc') },
    ],
    [t],
  );

  const orderStatusOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'all', label: t('couriers.orderStatus.all') },
      ...COURIER_ORDER_STATUSES.map((status) => ({
        value: status,
        label: getCourierOrderStatusLabel(t, status),
      })),
    ],
    [t],
  );

  const orderOrderingOptions = useMemo<SelectOption[]>(
    () => [
      { value: '-updated_at', label: t('couriers.ordering.updatedNewest') },
      { value: 'updated_at', label: t('couriers.ordering.updatedOldest') },
      { value: '-created_at', label: t('couriers.ordering.createdNewest') },
      { value: 'created_at', label: t('couriers.ordering.createdOldest') },
      { value: 'status', label: t('couriers.ordering.statusAsc') },
      { value: '-status', label: t('couriers.ordering.statusDesc') },
    ],
    [t],
  );

  const orderCourierOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'all', label: t('couriers.status.all') },
      ...allCouriers.map((courier) => ({
        value: courier.id,
        label: getCourierName(courier),
      })),
    ],
    [allCouriers, t],
  );

  const courierColumns = useMemo<DataTableColumn<Courier>[]>(
    () => [
      {
        key: 'courier',
        label: t('couriers.columns.courier'),
        render: (courier) => (
          <div className="grid gap-0.5">
            <span className={tablePrimaryTextClassName}>{getCourierName(courier)}</span>
            <span className={tableSecondaryTextClassName}>
              {courier.username ? `@${courier.username}` : courier.telegramUserId || t('common.na')}
            </span>
          </div>
        ),
      },
      {
        key: 'phone',
        label: t('couriers.columns.phone'),
        render: (courier) => (
          <span className={tablePrimaryTextClassName}>{courier.phone || t('common.na')}</span>
        ),
      },
      {
        key: 'status',
        label: t('couriers.columns.status'),
        render: (courier) => (
          <StatusBadge
            status={courier.isActive ? 'active' : 'inactive'}
            tone={courier.isActive ? 'success' : 'neutral'}
            label={courier.isActive ? t('common.active') : t('common.inactive')}
          />
        ),
      },
      {
        key: 'updatedAt',
        label: t('couriers.columns.updated'),
        render: (courier) => (
          <span className={tablePrimaryTextClassName}>
            {formatLocalizedDate(courier.updatedAt, i18n.language, {
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
        label: t('couriers.columns.actions'),
        align: 'right',
        render: (courier) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              className={actionButtonClassName}
              onClick={(event) => {
                event.stopPropagation();
                setCourierFormMode('edit');
                setEditingCourier(courier);
                setCourierFormError(null);
                setIsCourierFormOpen(true);
              }}
              aria-label={`${t('couriers.actions.edit')} ${getCourierName(courier)}`}
            >
              <FiEdit2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className={actionButtonClassName}
              onClick={(event) => {
                event.stopPropagation();
                setCourierToDelete(courier);
              }}
              aria-label={`${t('couriers.actions.delete')} ${getCourierName(courier)}`}
            >
              <FiTrash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [i18n.language, locale, t],
  );

  const orderColumns = useMemo<DataTableColumn<CourierOrder>[]>(
    () => [
      {
        key: 'order',
        label: t('couriers.columns.order'),
        render: (order) => (
          <span className={tablePrimaryTextClassName}>
            {order.orderDetail || order.orderId || order.id}
          </span>
        ),
      },
      {
        key: 'courier',
        label: t('couriers.columns.courier'),
        render: (order) => (
          <span className={tablePrimaryTextClassName}>
            {order.courier ? getCourierName(order.courier) : t('common.unassigned')}
          </span>
        ),
      },
      {
        key: 'status',
        label: t('couriers.columns.status'),
        render: (order) => (
          <StatusBadge
            status={order.status}
            label={getCourierOrderStatusLabel(t, order.status)}
          />
        ),
      },
      {
        key: 'updatedAt',
        label: t('couriers.columns.updated'),
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
    ],
    [i18n.language, locale, t],
  );

  const header = (
    <PageHeader
      eyebrow={t('routes.couriers.title')}
      title={t('routes.couriers.title')}
      subtitle={t('routes.couriers.description')}
      actions={
        <div className="flex w-full flex-wrap items-center gap-2 min-[768px]:w-auto">
          {workspaceTab === 'couriers' ? (
            <button
              type="button"
              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground"
              onClick={() => {
                setCourierFormMode('create');
                setEditingCourier(null);
                setCourierFormError(null);
                setIsCourierFormOpen(true);
              }}
            >
              <AppIcon name="plus" className="h-4 w-4" aria-hidden="true" />
              {t('couriers.newCourier')}
            </button>
          ) : null}
          <span className="inline-flex min-h-8 items-center gap-2 rounded-pill bg-primary/12 px-3 text-[12px] font-semibold text-text-accent">
            <AppIcon
              name={workspaceTab === 'couriers' ? 'couriers' : 'orders'}
              className="h-3.5 w-3.5"
              aria-hidden="true"
            />
            {workspaceTab === 'couriers'
              ? `${courierPagination.totalItems} ${t('couriers.tabs.couriers').toLowerCase()}`
              : `${orderPagination.totalItems} ${t('couriers.tabs.orders').toLowerCase()}`}
          </span>
        </div>
      }
    />
  );

  return (
    <PageLayout header={header}>
      <PageSection>
        <FilterBar>
          <div className="inline-flex rounded-lg bg-surface-subtle p-1 ring-1 ring-border-soft/35">
            <button
              type="button"
              onClick={() => setWorkspaceTab('couriers')}
              className={
                workspaceTab === 'couriers'
                  ? 'inline-flex min-h-8 items-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground'
                  : 'inline-flex min-h-8 items-center rounded-md px-3 text-sm font-semibold text-text-secondary'
              }
            >
              {t('couriers.tabs.couriers')}
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceTab('orders')}
              className={
                workspaceTab === 'orders'
                  ? 'inline-flex min-h-8 items-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground'
                  : 'inline-flex min-h-8 items-center rounded-md px-3 text-sm font-semibold text-text-secondary'
              }
            >
              {t('couriers.tabs.orders')}
            </button>
          </div>

          {workspaceTab === 'couriers' ? (
            <>
              <SearchInput
                value={courierSearch}
                onChange={setCourierSearch}
                placeholder={t('couriers.searchCourierPlaceholder')}
              />
              <label className="grid min-w-[min(170px,100%)] flex-[1_1_170px] gap-1.5 min-[640px]:flex-[0_1_170px]">
                <span className={labelClassName}>{t('couriers.filters.status')}</span>
                <FilterSelect
                  value={courierActiveFilter}
                  options={activeOptions}
                  onChange={(value) => setCourierActiveFilter(value as ActiveFilter)}
                  disabled={isCouriersLoading}
                />
              </label>
              <label className="grid min-w-[min(190px,100%)] flex-[1_1_190px] gap-1.5 min-[640px]:flex-[0_1_220px]">
                <span className={labelClassName}>{t('couriers.filters.orderBy')}</span>
                <FilterSelect
                  value={courierOrdering}
                  options={courierOrderingOptions}
                  onChange={(value) => setCourierOrdering(value as CourierOrdering)}
                  disabled={isCouriersLoading}
                />
              </label>
            </>
          ) : (
            <>
              <SearchInput
                value={orderSearch}
                onChange={setOrderSearch}
                placeholder={t('couriers.searchOrderPlaceholder')}
              />
              <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_190px]">
                <span className={labelClassName}>{t('couriers.filters.courier')}</span>
                <FilterSelect
                  value={orderCourierFilter}
                  options={orderCourierOptions}
                  onChange={setOrderCourierFilter}
                  disabled={isOrdersLoading}
                />
              </label>
              <label className="grid min-w-[min(170px,100%)] flex-[1_1_170px] gap-1.5 min-[640px]:flex-[0_1_180px]">
                <span className={labelClassName}>{t('couriers.filters.status')}</span>
                <FilterSelect
                  value={orderStatusFilter}
                  options={orderStatusOptions}
                  onChange={(value) => setOrderStatusFilter(value as OrderFilter)}
                  disabled={isOrdersLoading}
                />
              </label>
              <label className="grid min-w-[min(190px,100%)] flex-[1_1_190px] gap-1.5 min-[640px]:flex-[0_1_220px]">
                <span className={labelClassName}>{t('couriers.filters.orderBy')}</span>
                <FilterSelect
                  value={orderOrdering}
                  options={orderOrderingOptions}
                  onChange={(value) => setOrderOrdering(value as OrderOrdering)}
                  disabled={isOrdersLoading}
                />
              </label>
            </>
          )}
        </FilterBar>

        {workspaceTab === 'couriers' ? (
          !hasLoadedCouriersOnce && isCouriersLoading ? (
            <PageCard>
              <LoadingState
                title={t('couriers.courierLoadingTitle')}
                description={t('couriers.courierLoadingDescription')}
              />
            </PageCard>
          ) : hasCouriersError ? (
            <PageCard>
              <EmptyState
                title={t('couriers.courierErrorTitle')}
                description={t('couriers.courierErrorDescription')}
              />
            </PageCard>
          ) : (
            <>
              <PageCard>
                <DataTable
                  data={couriers}
                  columns={courierColumns}
                  rowKey="id"
                  selectedRowKey={selectedCourierId}
                  loading={isCouriersLoading}
                  onRowClick={(courier) => setSelectedCourierId(courier.id)}
                  emptyTitle={t('couriers.courierEmptyTitle')}
                  emptyDescription={t('couriers.courierEmptyDescription')}
                />
              </PageCard>
              {!isCouriersLoading && courierPagination.totalItems > 0 ? (
                <Pagination
                  currentPage={Math.min(courierPage, courierPagination.totalPages)}
                  totalPages={courierPagination.totalPages}
                  totalItems={courierPagination.totalItems}
                  onPageChange={setCourierPage}
                />
              ) : null}
            </>
          )
        ) : !hasLoadedOrdersOnce && isOrdersLoading ? (
          <PageCard>
            <LoadingState
              title={t('couriers.orderLoadingTitle')}
              description={t('couriers.orderLoadingDescription')}
            />
          </PageCard>
        ) : hasOrdersError ? (
          <PageCard>
            <EmptyState
              title={t('couriers.orderErrorTitle')}
              description={t('couriers.orderErrorDescription')}
            />
          </PageCard>
        ) : (
          <>
            <PageCard>
              <DataTable
                data={orders}
                columns={orderColumns}
                rowKey="id"
                selectedRowKey={selectedOrderId}
                loading={isOrdersLoading}
                onRowClick={(order) => setSelectedOrderId(order.id)}
                emptyTitle={t('couriers.orderEmptyTitle')}
                emptyDescription={t('couriers.orderEmptyDescription')}
              />
            </PageCard>
            {!isOrdersLoading && orderPagination.totalItems > 0 ? (
              <Pagination
                currentPage={Math.min(orderPage, orderPagination.totalPages)}
                totalPages={orderPagination.totalPages}
                totalItems={orderPagination.totalItems}
                onPageChange={setOrderPage}
              />
            ) : null}
          </>
        )}
      </PageSection>

      {selectedCourierId ? (
        <CourierDetailPanel
          courierId={selectedCourierId}
          refreshToken={courierDetailRefreshToken}
          onClose={() => setSelectedCourierId(null)}
          onEdit={(courier) => {
            setCourierFormMode('edit');
            setEditingCourier(courier);
            setIsCourierFormOpen(true);
            setSelectedCourierId(null);
          }}
          onDelete={(courier) => {
            setCourierToDelete(courier);
            setSelectedCourierId(null);
          }}
          onToggleActive={handleToggleCourierActive}
        />
      ) : null}

      {selectedOrderId ? (
        <CourierOrderDetailPanel
          orderId={selectedOrderId}
          refreshToken={orderDetailRefreshToken}
          onClose={() => setSelectedOrderId(null)}
          onUpdated={handleOrderUpdated}
        />
      ) : null}

      {isCourierFormOpen ? (
        <CourierFormPanel
          mode={courierFormMode}
          courier={editingCourier}
          isSubmitting={isCourierSaving}
          errorMessage={courierFormError}
          onClose={() => {
            if (!isCourierSaving) {
              setIsCourierFormOpen(false);
              setEditingCourier(null);
              setCourierFormError(null);
            }
          }}
          onSubmit={handleSaveCourier}
        />
      ) : null}

      {courierToDelete ? (
        <CourierDeleteDialog
          courier={courierToDelete}
          isDeleting={isCourierDeleting}
          onCancel={() => {
            if (!isCourierDeleting) {
              setCourierToDelete(null);
            }
          }}
          onConfirm={() => {
            void handleConfirmDeleteCourier();
          }}
        />
      ) : null}
    </PageLayout>
  );
}

export default CouriersPage;
