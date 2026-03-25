import { useEffect, useMemo, useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';
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
import { PAYMENT_METHODS, PAYMENT_STATUSES } from '../../../constants';
import PaymentDeleteDialog from '../../../features/payments/components/PaymentDeleteDialog';
import PaymentDetailPanel from '../../../features/payments/components/PaymentDetailPanel';
import PaymentFormPanel from '../../../features/payments/components/PaymentFormPanel';
import { getPaymentMethodLabel, getPaymentStatusLabel } from '../../../i18n/labels';
import { services } from '../../../services';
import { useAuth } from '../../../auth';
import type {
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
const ALL_STATUS_VALUE = 'all';
const ALL_METHOD_VALUE = 'all';
const DEFAULT_ORDERING: PaymentOrdering = '-updated_at';

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

const filterInputClassName = [
  'min-h-[44px] w-full rounded-lg border-0 bg-surface-card px-3.5 text-sm font-medium text-text-primary shadow-sm outline-none transition duration-fast',
  'placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

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

function formatDate(timestamp: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
    new Date(timestamp),
  );
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

function PaymentsPage() {
  const { t, i18n } = useTranslation();
  const { hasPermission } = useAuth();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';
  const canManagePayments = hasPermission('can_manage_payments');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUS_VALUE);
  const [methodFilter, setMethodFilter] = useState<string>(ALL_METHOD_VALUE);
  const [orderFilter, setOrderFilter] = useState('');
  const [ordering, setOrdering] = useState<PaymentOrdering>(DEFAULT_ORDERING);
  const [currentPage, setCurrentPage] = useState(1);

  const [payments, setPayments] = useState<Payment[]>([]);
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
  const [isSaving, setIsSaving] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);

  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, methodFilter, orderFilter, ordering]);

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
          search: search.trim() || undefined,
          status:
            statusFilter === ALL_STATUS_VALUE
              ? undefined
              : (statusFilter as PaymentStatus),
          method:
            methodFilter === ALL_METHOD_VALUE
              ? undefined
              : (methodFilter as PaymentMethod),
          order: orderFilter.trim() || undefined,
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
    methodFilter,
    orderFilter,
    ordering,
    reloadCursor,
    search,
    statusFilter,
  ]);

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
      const deleted = await services.payments.deletePayment(paymentToDelete.id);
      if (!deleted) {
        throw new Error(t('payments.actions.notFoundError'));
      }

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

    setPayments((current) =>
      current.map((payment) => (payment.id === id ? updated : payment)),
    );
    setDetailRefreshToken((current) => current + 1);
    setReloadCursor((current) => current + 1);
    return updated;
  }

  async function handleVerifyPayment(id: EntityId): Promise<Payment | null> {
    const updated = await services.payments.verifyPayment(id);
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
              {shortenPaymentId(payment.id)}
            </span>
            <span className={tableSecondaryTextClassName}>
              {payment.verification_reference ?? t('payments.noReference')}
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
          <span className={tablePrimaryTextClassName}>{payment.order}</span>
        ),
      },
      {
        key: 'updatedAt',
        label: t('payments.columns.updated'),
        render: (payment) => (
          <span className={tablePrimaryTextClassName}>
            {formatDate(payment.updated_at, locale)}
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
              aria-label={t('payments.actions.deleteWithId', { id: payment.id })}
            >
              <FiTrash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      },
    ];
  }, [canManagePayments, locale, t]);

  const activeFilterCount =
    Number(statusFilter !== ALL_STATUS_VALUE) +
    Number(methodFilter !== ALL_METHOD_VALUE) +
    Number(orderFilter.trim().length > 0) +
    Number(ordering !== DEFAULT_ORDERING);

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
              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              onClick={() => {
                setIsFormOpen(true);
                setFormErrorMessage(null);
              }}
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
            disabled={isLoading}
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

          <label className="grid min-w-[min(170px,100%)] flex-[1_1_170px] gap-1.5 min-[640px]:flex-[0_1_170px]">
            <span className={labelClassName}>{t('payments.order')}</span>
            <input
              type="text"
              value={orderFilter}
              onChange={(event) => setOrderFilter(event.target.value)}
              className={filterInputClassName}
              placeholder={t('payments.orderPlaceholder')}
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
          onVerify={handleVerifyPayment}
        />
      ) : null}

      {isFormOpen ? (
        <PaymentFormPanel
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
