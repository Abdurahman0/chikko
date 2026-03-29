import { useEffect, useMemo, useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  formatCurrencyAmount,
} from '../../../constants';
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
import PaymentDeleteDialog from '../../../features/payments/components/PaymentDeleteDialog';
import PaymentDetailPanel from '../../../features/payments/components/PaymentDetailPanel';
import PaymentFormPanel from '../../../features/payments/components/PaymentFormPanel';
import { formatLocalizedDate } from '../../../i18n/date-format';
import { getPaymentMethodLabel, getPaymentStatusLabel } from '../../../i18n/labels';
import { usePersistentState } from '../../../lib/persistent-state';
import { services } from '../../../services';
import { useAuth } from '../../../auth';
import type {
  Order,
  OrderStatus,
  EntityId,
  PaginationMeta,
  Payment,
  PaymentMethod,
  PaymentMutationInput,
  PaymentStatus,
  SelectOption,
  TableQueryParams,
} from '../../../types/domain';

type PaymentOrdering =
  | '-updated_at'
  | 'updated_at'
  | '-created_at'
  | 'created_at'
  | '-amount'
  | 'amount';

const PAGE_SIZE = 8;
const ORDER_OPTIONS_FETCH_SIZE = 400;
const SEARCH_DEBOUNCE_MS = 350;
const ALL_STATUS_VALUE = 'all';
const ALL_METHOD_VALUE = 'all';
const DEFAULT_ORDERING: PaymentOrdering = '-updated_at';
const ORDER_STATUS_AFTER_PAYMENT_CREATE: OrderStatus = 'waiting_payment';
const ORDER_STATUS_AFTER_PAYMENT_REJECT: OrderStatus = 'cancelled';
const ORDER_STATUS_AFTER_PAYMENT_DELETE: OrderStatus = 'draft';

const DEFAULT_PAGINATION_META: PaginationMeta = {
  page: 1,
  pageSize: PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
};

type PaymentFormOrderSummary = {
  amount: number;
  customerName: string;
  customerPhone: string;
  createdAtLabel: string;
};

function resolveOrderLabel(order: Order | null): string | null {
  if (!order) {
    return null;
  }

  const label =
    order.orderNumber ||
    order.customer?.fullName ||
    order.contactName ||
    null;

  return label && label.trim().length > 0 ? label : null;
}

function getOrderOptionLabel(
  order: Order,
  fallback: string,
  productNameById: Map<string, string>,
  productNameBySku: Map<string, string>,
  productNameByName: Map<string, string>,
): string {
  const primaryProductName = getOrderPrimaryProductName(
    order,
    productNameById,
    productNameBySku,
    productNameByName,
  );
  const customerName =
    order.customer?.fullName?.trim() || order.contactName?.trim() || '';
  const orderNumber = order.orderNumber?.trim() ?? '';

  if (primaryProductName) {
    return primaryProductName;
  }

  if (orderNumber) {
    return orderNumber;
  }

  if (customerName) {
    return customerName;
  }

  return fallback;
}

function getOrderPrimaryProductName(
  order: Order,
  productNameById: Map<string, string>,
  productNameBySku: Map<string, string>,
  productNameByName: Map<string, string>,
): string {
  const firstItem = order.items[0];
  if (!firstItem) {
    return '';
  }

  const productId = firstItem.product.id?.trim() ?? '';
  if (productId) {
    const catalogName = productNameById.get(productId);
    if (catalogName) {
      return catalogName;
    }
  }

  const sku = firstItem.product.sku?.trim().toUpperCase() ?? '';
  if (sku) {
    const fromSku = productNameBySku.get(sku);
    if (fromSku) {
      return fromSku;
    }
  }

  const name = firstItem.product.name?.trim() ?? '';
  if (name) {
    const fromName = productNameByName.get(name.toLowerCase());
    if (fromName) {
      return fromName;
    }
  }

  return name;
}

function orderHasLinkedPayment(order: Order): boolean {
  const paymentCount =
    typeof order.paymentCount === 'number' && Number.isFinite(order.paymentCount)
      ? order.paymentCount
      : 0;

  if (paymentCount > 0) {
    return true;
  }

  return Boolean(order.paymentStatus && order.paymentStatus !== 'unpaid');
}

const tablePrimaryTextClassName =
  'block max-w-[140px] truncate text-sm font-semibold leading-[1.35] text-text-primary min-[640px]:max-w-[220px]';

const tableSecondaryTextClassName =
  'block max-w-[140px] truncate text-[12px] leading-[1.45] text-text-secondary min-[640px]:max-w-[220px]';

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

const actionButtonClassName =
  'inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface-card text-text-secondary shadow-sm ring-1 ring-border-soft/40 transition duration-fast hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20';

type PaymentStatusBadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

function parseOrdering(ordering: PaymentOrdering): Pick<
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

function formatDate(
  timestamp: string,
  language: string,
  locale: string,
  fallback: string,
): string {
  return formatLocalizedDate(timestamp, language, {
    locale,
    withYear: true,
    shortMonth: true,
    fallback,
  });
}

function formatOrderOptionDate(
  timestamp: string,
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

function formatAmount(amount: number, locale: string): string {
  return formatCurrencyAmount(amount, locale);
}

function formatPaymentMethodLabel(
  method: PaymentMethod,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  return getPaymentMethodLabel(t, method);
}

function shortenPaymentId(id: string): string {
  if (id.length <= 16) {
    return id;
  }

  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}

function getPaymentDisplayLabel(payment: Payment): string {
  const candidate =
    payment.submitted_by_name.trim() ||
    (payment.verification_reference ?? '').trim() ||
    '';

  if (candidate) {
    return candidate;
  }

  return 'Payment';
}

async function syncOrderStatusAfterPaymentAction(
  orderId: EntityId,
  status: OrderStatus,
): Promise<void> {
  try {
    await services.orders.patch(orderId, { status });
  } catch {
    try {
      await services.orders.recalculate(orderId, { status });
    } catch {
      // Non-blocking: primary payment action already completed.
    }
  }
}

function getPaymentStatusTone(status: PaymentStatus): PaymentStatusBadgeTone {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'approved':
      return 'success';
    case 'rejected':
      return 'danger';
    case 'verified':
      return 'info';
    case 'failed':
    default:
      return 'neutral';
  }
}

function PaymentsPage() {
  const { t, i18n } = useTranslation();
  const { hasPermission } = useAuth();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';
  const canManagePayments = hasPermission('can_manage_payments');

  const [search, setSearch] = usePersistentState('payments:search', '');
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUS_VALUE);
  const [methodFilter, setMethodFilter] = useState<string>(ALL_METHOD_VALUE);
  const [ordering, setOrdering] = useState<PaymentOrdering>(DEFAULT_ORDERING);
  const [currentPage, setCurrentPage] = useState(1);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [orderLabelById, setOrderLabelById] = useState<Record<string, string>>({});
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>(
    DEFAULT_PAGINATION_META,
  );

  const [selectedPaymentId, setSelectedPaymentId] = useState<EntityId | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [reloadCursor, setReloadCursor] = useState(0);
  const [detailRefreshToken, setDetailRefreshToken] = useState(0);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formOrderOptions, setFormOrderOptions] = useState<SelectOption[]>([]);
  const [formOrderSummaryById, setFormOrderSummaryById] = useState<
    Record<string, PaymentFormOrderSummary>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);

  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, methodFilter, ordering]);

  useEffect(() => {
    let isActive = true;

    async function loadPayments() {
      setIsLoading(true);
      setHasError(false);

      try {
        const sortConfig = parseOrdering(ordering);
        const result = await services.payments.listPayments({
          page: currentPage,
          pageSize: PAGE_SIZE,
          search: debouncedSearch || undefined,
          status:
            statusFilter === ALL_STATUS_VALUE
              ? undefined
              : (statusFilter as PaymentStatus),
          method:
            methodFilter === ALL_METHOD_VALUE
              ? undefined
              : (methodFilter as PaymentMethod),
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

        setPayments(result.items);
        setPaginationMeta(result.meta);

        const orderIds = Array.from(
          new Set(
            result.items
              .map((payment) => payment.order)
              .filter((orderId) => orderId.trim().length > 0),
          ),
        );

        void (async () => {
          const resolvedEntries = await Promise.all(
            orderIds.map(async (orderId) => {
              try {
                const order = await services.orders.getById(orderId);
                return [orderId, resolveOrderLabel(order)] as const;
              } catch {
                return [orderId, null] as const;
              }
            }),
          );

          if (!isActive) {
            return;
          }

          setOrderLabelById((current) => {
            const next = { ...current };
            for (const [orderId, label] of resolvedEntries) {
              if (label) {
                next[orderId] = label;
              }
            }
            return next;
          });
        })();
      } catch {
        if (!isActive) {
          return;
        }

        setHasError(true);
        setPayments([]);
        setPaginationMeta(DEFAULT_PAGINATION_META);
      } finally {
        if (isActive) {
          setHasLoadedOnce(true);
          setIsLoading(false);
        }
      }
    }

    void loadPayments();

    return () => {
      isActive = false;
    };
  }, [
    currentPage,
    debouncedSearch,
    methodFilter,
    ordering,
    reloadCursor,
    statusFilter,
  ]);

  useEffect(() => {
    if (!canManagePayments) {
      return;
    }

    let isActive = true;

    async function loadOrderOptions() {
      try {
        const [ordersResult, productsResult] = await Promise.all([
          services.orders.list({
            page: 1,
            pageSize: ORDER_OPTIONS_FETCH_SIZE,
            ordering: '-updated_at',
          }),
          services.products.list({
            page: 1,
            pageSize: ORDER_OPTIONS_FETCH_SIZE,
            ordering: 'name',
          }),
        ]);

        if (!isActive) {
          return;
        }

        const productNameById = new Map(
          productsResult.items.map((product) => [product.id, product.name]),
        );
        const productNameBySku = new Map(
          productsResult.items
            .map((product) => [(product.sku ?? '').trim().toUpperCase(), product.name] as const)
            .filter(([sku]) => sku.length > 0),
        );
        const productNameByName = new Map(
          productsResult.items
            .map((product) => [product.name.trim().toLowerCase(), product.name] as const)
            .filter(([name]) => name.length > 0),
        );

        const availableOrders = ordersResult.items
          .filter(
            (order) =>
              order.status !== 'cancelled' &&
              order.status !== 'completed' &&
              order.status !== 'paid' &&
              !orderHasLinkedPayment(order),
          )
          .sort(
            (left, right) =>
              new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
          );

        const options = availableOrders.map((order) => ({
          value: order.id,
          label: getOrderOptionLabel(
            order,
            t('payments.order'),
            productNameById,
            productNameBySku,
            productNameByName,
          ),
        }));

        const summaries = availableOrders.reduce<Record<string, PaymentFormOrderSummary>>(
          (accumulator, order) => {
            accumulator[order.id] = {
              amount: Number.isFinite(order.totalAmount) ? order.totalAmount : 0,
              customerName:
                order.customer?.fullName?.trim() ||
                order.contactName?.trim() ||
                t('common.notAvailable'),
              customerPhone:
                order.customer?.phone?.trim() ||
                order.contactPhone?.trim() ||
                t('common.notAvailable'),
              createdAtLabel: formatOrderOptionDate(
                order.createdAt,
                i18n.language,
                locale,
              ),
            };
            return accumulator;
          },
          {},
        );

        setFormOrderOptions(options);
        setFormOrderSummaryById(summaries);
      } catch {
        if (!isActive) {
          return;
        }

        setFormOrderOptions([]);
        setFormOrderSummaryById({});
      }
    }

    void loadOrderOptions();

    return () => {
      isActive = false;
    };
  }, [canManagePayments, i18n.language, locale, reloadCursor, t]);

  useEffect(() => {
    if (!selectedPaymentId) {
      return;
    }

    const selectedVisible = payments.some((payment) => payment.id === selectedPaymentId);
    if (!selectedVisible) {
      setSelectedPaymentId(null);
    }
  }, [payments, selectedPaymentId]);

  async function handleCreatePayment(payload: PaymentMutationInput) {
    setIsSaving(true);
    setFormErrorMessage(null);

    try {
      await services.payments.createPayment(payload);
      await syncOrderStatusAfterPaymentAction(
        payload.order,
        ORDER_STATUS_AFTER_PAYMENT_CREATE,
      );
      setIsFormOpen(false);
      setReloadCursor((current) => current + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('payments.form.saveError');
      const knownErrorKeys = new Set([
        'Amount must be a valid positive number.',
        'Submitted by name is required.',
        'Order is required.',
        'Invalid payment method.',
        'Last 4 digits must contain exactly four numbers.',
      ]);
      setFormErrorMessage(
        knownErrorKeys.has(message) ? t('payments.form.saveError') : message,
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!paymentToDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      const orderId = paymentToDelete.order;
      const deleted = await services.payments.deletePayment(paymentToDelete.id);
      if (!deleted) {
        throw new Error(t('payments.actions.notFoundError'));
      }

      await syncOrderStatusAfterPaymentAction(
        orderId,
        ORDER_STATUS_AFTER_PAYMENT_DELETE,
      );

      if (selectedPaymentId === paymentToDelete.id) {
        setSelectedPaymentId(null);
      }

      setPaymentToDelete(null);
      setReloadCursor((current) => current + 1);
    } catch {
      // Keep dialog open when deletion fails.
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleApprovePayment(id: EntityId): Promise<Payment | null> {
    const updated = await services.payments.approvePayment(id);
    if (!updated) {
      return null;
    }

    setPayments((current) =>
      current.map((payment) => (payment.id === id ? updated : payment)),
    );
    setDetailRefreshToken((current) => current + 1);
    setReloadCursor((current) => current + 1);
    return updated;
  }

  async function handleRejectPayment(id: EntityId): Promise<Payment | null> {
    const updated = await services.payments.rejectPayment(id);
    if (!updated) {
      return null;
    }

    await syncOrderStatusAfterPaymentAction(
      updated.order,
      ORDER_STATUS_AFTER_PAYMENT_REJECT,
    );

    setPayments((current) =>
      current.map((payment) => (payment.id === id ? updated : payment)),
    );
    setDetailRefreshToken((current) => current + 1);
    setReloadCursor((current) => current + 1);
    return updated;
  }

  const statusOptions = useMemo<SelectOption[]>(
    () => [
      { value: ALL_STATUS_VALUE, label: t('payments.all') },
      ...PAYMENT_STATUSES.map((status) => ({
        value: status,
        label: getPaymentStatusLabel(t, status),
      })),
    ],
    [t],
  );

  const methodOptions = useMemo<SelectOption[]>(
    () => [
      { value: ALL_METHOD_VALUE, label: t('payments.all') },
      ...PAYMENT_METHODS.map((method) => ({
        value: method,
        label: formatPaymentMethodLabel(method, t),
      })),
    ],
    [t],
  );

  const orderingOptions = useMemo<SelectOption[]>(
    () => [
      { value: '-updated_at', label: t('payments.ordering.updatedNewest') },
      { value: 'updated_at', label: t('payments.ordering.updatedOldest') },
      { value: '-created_at', label: t('payments.ordering.createdNewest') },
      { value: 'created_at', label: t('payments.ordering.createdOldest') },
      { value: '-amount', label: t('payments.ordering.amountHighLow') },
      { value: 'amount', label: t('payments.ordering.amountLowHigh') },
    ],
    [t],
  );

  const columns = useMemo<DataTableColumn<Payment>[]>(() => {
    const baseColumns: DataTableColumn<Payment>[] = [
      {
        key: 'payment',
        label: t('payments.columns.payment'),
        render: (payment) => (
          <div className="grid gap-0.5">
            <span className={tablePrimaryTextClassName}>
              {getPaymentDisplayLabel(payment)}
            </span>
            <span className={tableSecondaryTextClassName}>
              {payment.verification_reference || t('payments.noReference')}
            </span>
          </div>
        ),
      },
      {
        key: 'amount',
        label: t('payments.columns.amount'),
        render: (payment) => (
          <span className={tablePrimaryTextClassName}>
            {formatAmount(payment.amount, locale)}
          </span>
        ),
      },
      {
        key: 'method',
        label: t('payments.columns.method'),
        render: (payment) => (
          <span className="inline-flex min-h-7 items-center rounded-pill bg-info-bg px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-info">
            {formatPaymentMethodLabel(payment.method, t)}
          </span>
        ),
      },
      {
        key: 'status',
        label: t('payments.columns.status'),
        render: (payment) => (
          <StatusBadge
            status={payment.status}
            tone={getPaymentStatusTone(payment.status)}
            label={getPaymentStatusLabel(t, payment.status)}
          />
        ),
      },
      {
        key: 'submitted',
        label: t('payments.columns.submittedBy'),
        render: (payment) => (
          <span className={tablePrimaryTextClassName}>{payment.submitted_by_name}</span>
        ),
      },
      {
        key: 'lastFour',
        label: t('payments.columns.lastFourDigits'),
        render: (payment) => (
          <span className={tablePrimaryTextClassName}>
            {payment.last_four_digits ?? t('payments.notAvailable')}
          </span>
        ),
      },
      {
        key: 'order',
        label: t('payments.columns.order'),
        render: (payment) => (
          <span className={tablePrimaryTextClassName}>
            {orderLabelById[payment.order] ?? t('payments.notAvailable')}
          </span>
        ),
      },
      {
        key: 'createdAt',
        label: t('payments.detail.createdAt'),
        render: (payment) => (
          <span className={tablePrimaryTextClassName}>
            {formatDate(payment.created_at, i18n.language, locale, t('common.na'))}
          </span>
        ),
      },
    ];

    if (!canManagePayments) {
      return baseColumns;
    }

    return [
      ...baseColumns,
      {
        key: 'actions',
        label: t('payments.columns.actions'),
        align: 'right',
        render: (payment) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              className={actionButtonClassName}
              onClick={(event) => {
                event.stopPropagation();
                setPaymentToDelete(payment);
              }}
              aria-label={t('payments.actions.deleteWithId', {
                id: getPaymentDisplayLabel(payment),
              })}
            >
              <FiTrash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      },
    ];
  }, [canManagePayments, i18n.language, locale, orderLabelById, t]);

  const activeFilterCount =
    Number(statusFilter !== ALL_STATUS_VALUE) +
    Number(methodFilter !== ALL_METHOD_VALUE) +
    Number(ordering !== DEFAULT_ORDERING);
  const hasEligibleOrders = formOrderOptions.length > 0;

  const header = (
    <PageHeader
      eyebrow={t('payments.title')}
      title={t('payments.title')}
      subtitle={t('payments.subtitle')}
      actions={
        <div className="flex w-full flex-wrap items-center gap-2 min-[768px]:w-auto">
          {canManagePayments ? (
            <button
              type="button"
              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                if (!hasEligibleOrders) {
                  return;
                }
                setIsFormOpen(true);
                setFormErrorMessage(null);
              }}
              disabled={!hasEligibleOrders}
              title={!hasEligibleOrders ? t('payments.form.noEligibleOrders') : undefined}
            >
              <AppIcon name="plus" className="h-4 w-4" aria-hidden="true" />
              {t('payments.newPayment')}
            </button>
          ) : null}
          <span className="inline-flex min-h-8 items-center gap-2 rounded-pill bg-primary/12 px-3 text-[12px] font-semibold text-text-accent">
            <AppIcon name="payments" className="h-3.5 w-3.5" aria-hidden="true" />
            {paginationMeta.totalItems} {t('payments.records')}
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
              title={t('payments.loadingTitle')}
              description={t('payments.loadingDescription')}
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
              title={t('payments.errorTitle')}
              description={t('payments.errorDescription')}
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
                {paginationMeta.totalItems} {t('payments.records')}
              </span>
              {activeFilterCount > 0 ? (
                <span className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary/12 px-3 text-sm font-semibold text-text-accent">
                  <AppIcon name="filter" className="h-4 w-4" aria-hidden="true" />
                  {activeFilterCount} {t('payments.activeFilters')}
                </span>
              ) : null}
              {selectedPaymentId ? (
                <span className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-info-bg px-3 text-sm font-semibold text-info">
                  {t('payments.detailOpen')}
                </span>
              ) : null}
            </div>
          }
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t('payments.searchPlaceholder')}
          />

          <label className="grid min-w-[min(170px,100%)] flex-[1_1_170px] gap-1.5 min-[640px]:flex-[0_1_170px]">
            <span className={labelClassName}>{t('payments.status')}</span>
            <FilterSelect
              value={statusFilter}
              options={statusOptions}
              onChange={setStatusFilter}
              disabled={isLoading}
            />
          </label>

          <label className="grid min-w-[min(170px,100%)] flex-[1_1_170px] gap-1.5 min-[640px]:flex-[0_1_170px]">
            <span className={labelClassName}>{t('payments.method')}</span>
            <FilterSelect
              value={methodFilter}
              options={methodOptions}
              onChange={setMethodFilter}
              disabled={isLoading}
            />
          </label>

          <label className="grid min-w-[min(190px,100%)] flex-[1_1_190px] gap-1.5 min-[640px]:flex-[0_1_210px]">
            <span className={labelClassName}>{t('payments.orderBy')}</span>
            <FilterSelect
              value={ordering}
              options={orderingOptions}
              onChange={(value) => setOrdering(value as PaymentOrdering)}
              disabled={isLoading}
            />
          </label>
        </FilterBar>

        <PageCard>
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <h2 className="m-0 text-[1rem] font-semibold text-text-primary">
                {t('payments.boardTitle')}
              </h2>
              <span className="text-[12px] font-medium text-text-muted">
                {t('payments.boardHint')}
              </span>
            </div>

            <DataTable
              data={payments}
              columns={columns}
              rowKey="id"
              selectedRowKey={selectedPaymentId}
              loading={isLoading}
              onRowClick={(payment) => setSelectedPaymentId(payment.id)}
              emptyTitle={t('payments.emptyTitle')}
              emptyDescription={t('payments.emptyDescription')}
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

      {selectedPaymentId ? (
        <PaymentDetailPanel
          paymentId={selectedPaymentId}
          refreshToken={detailRefreshToken}
          canManagePayments={canManagePayments}
          onClose={() => setSelectedPaymentId(null)}
          onDelete={(payment) => {
            if (canManagePayments) {
              setPaymentToDelete(payment);
            }
          }}
          onApprove={handleApprovePayment}
          onReject={handleRejectPayment}
        />
      ) : null}

      {isFormOpen ? (
        <PaymentFormPanel
          orderOptions={formOrderOptions}
          orderSummaryById={formOrderSummaryById}
          isSubmitting={isSaving}
          errorMessage={formErrorMessage}
          onClose={() => {
            if (!isSaving) {
              setIsFormOpen(false);
              setFormErrorMessage(null);
            }
          }}
          onSubmit={handleCreatePayment}
        />
      ) : null}

      {paymentToDelete ? (
        <PaymentDeleteDialog
          payment={paymentToDelete}
          paymentLabel={getPaymentDisplayLabel(paymentToDelete)}
          isDeleting={isDeleting}
          onCancel={() => {
            if (!isDeleting) {
              setPaymentToDelete(null);
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

export default PaymentsPage;
