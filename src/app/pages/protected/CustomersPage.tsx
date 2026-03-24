import { useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import {
  DataTable,
  FilterBar,
  FilterSelect,
  Pagination,
  SearchInput,
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
import CustomerDeleteDialog from '../../../features/customers/components/CustomerDeleteDialog';
import CustomerDetailPanel from '../../../features/customers/components/CustomerDetailPanel';
import CustomerFormPanel from '../../../features/customers/components/CustomerFormPanel';
import { useAuth } from '../../../auth';
import { services } from '../../../services';
import type {
  Customer,
  CustomerMutationInput,
  EntityId,
  Lead,
  PaginationMeta,
  SelectOption,
  TableQueryParams,
} from '../../../types/domain';

type CustomerOrdering =
  | '-updated_at'
  | 'updated_at'
  | '-created_at'
  | 'created_at';

const PAGE_SIZE = 8;
const SERVICE_FETCH_SIZE = 300;
const ALL_OPERATORS_VALUE = 'all';
const EMPTY_OPTION_VALUE = '';
const DEFAULT_ORDERING: CustomerOrdering = '-updated_at';

const TABLE_PRIMARY_TEXT_CLASS_NAME =
  'block text-sm font-semibold leading-[1.35] text-text-primary [overflow-wrap:anywhere]';

const TABLE_SECONDARY_TEXT_CLASS_NAME =
  'block text-[12px] leading-[1.45] text-text-secondary [overflow-wrap:anywhere]';

const LABEL_CLASS_NAME =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

const ACTION_BUTTON_CLASS_NAME =
  'inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface-card text-text-secondary shadow-sm ring-1 ring-border-soft/40 transition duration-fast hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20';

const DEFAULT_PAGINATION_META: PaginationMeta = {
  page: 1,
  pageSize: PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
};

function formatAddress(address: NonNullable<Customer['address']>): string {
  const parts = [address.line1, address.city, address.region].filter(Boolean);
  return parts.join(', ');
}

function parseOrdering(ordering: CustomerOrdering): Pick<
  TableQueryParams,
  'sortBy' | 'sortDirection'
> {
  const isDescending = ordering.startsWith('-');
  const sortBy = ordering.replace('-', '');

  return {
    sortBy,
    sortDirection: isDescending ? 'desc' : 'asc',
  };
}

function CustomersPage() {
  const { t, i18n } = useTranslation();
  const { hasPermission, currentUser } = useAuth();
  const canManageCustomers = hasPermission('can_manage_customers');

  const allOperatorsOption = useMemo<SelectOption>(
    () => ({
      value: ALL_OPERATORS_VALUE,
      label: t('customers.allOperators'),
    }),
    [t],
  );

  const [search, setSearch] = useState('');
  const [assignedOperatorFilter, setAssignedOperatorFilter] =
    useState<string>(ALL_OPERATORS_VALUE);
  const [ordering, setOrdering] = useState<CustomerOrdering>(DEFAULT_ORDERING);
  const [currentPage, setCurrentPage] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>(
    DEFAULT_PAGINATION_META,
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<EntityId | null>(
    null,
  );
  const [operatorOptions, setOperatorOptions] = useState<SelectOption[]>([]);
  const [leadOptions, setLeadOptions] = useState<SelectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [reloadCursor, setReloadCursor] = useState(0);
  const [detailRefreshToken, setDetailRefreshToken] = useState(0);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);

  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, assignedOperatorFilter, ordering]);

  useEffect(() => {
    let isActive = true;

    async function loadReferenceOptions() {
      try {
        const [customerResult, leadsResult] = await Promise.all([
          services.customers.listCustomers({
            page: 1,
            pageSize: SERVICE_FETCH_SIZE,
            ordering: '-updated_at',
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

        const operatorsById = new Map<string, string>();
        customerResult.items.forEach((customer) => {
          if (!customer.assignedOperator) {
            return;
          }

          operatorsById.set(
            customer.assignedOperator.id,
            customer.assignedOperator.fullName,
          );
        });

        if (currentUser?.role === 'operator') {
          operatorsById.set(currentUser.id, currentUser.fullName);
        }

        const nextOperatorOptions: SelectOption[] = [
          allOperatorsOption,
          ...Array.from(operatorsById.entries())
            .sort((left, right) => left[1].localeCompare(right[1]))
            .map(([value, label]) => ({ value, label })),
        ];

        const nextLeadOptions: SelectOption[] = [
          { value: EMPTY_OPTION_VALUE, label: t('customers.form.noLead') },
          ...[...leadsResult.items]
            .sort((left: Lead, right: Lead) => left.fullName.localeCompare(right.fullName))
            .map((lead: Lead) => ({
              value: lead.id,
              label: lead.fullName,
            })),
        ];

        setOperatorOptions(nextOperatorOptions);
        setLeadOptions(nextLeadOptions);
      } catch {
        if (!isActive) {
          return;
        }

        setOperatorOptions([allOperatorsOption]);
        setLeadOptions([{ value: EMPTY_OPTION_VALUE, label: t('customers.form.noLead') }]);
      }
    }

    void loadReferenceOptions();

    return () => {
      isActive = false;
    };
  }, [allOperatorsOption, currentUser, reloadCursor, t]);

  useEffect(() => {
    let isActive = true;

    async function loadCustomers() {
      setIsLoading(true);
      setHasError(false);

      try {
        const sortConfig = parseOrdering(ordering);
        const result = await services.customers.listCustomers({
          page: currentPage,
          pageSize: PAGE_SIZE,
          search,
          assignedOperator:
            assignedOperatorFilter === ALL_OPERATORS_VALUE
              ? undefined
              : assignedOperatorFilter,
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

        setCustomers(result.items);
        setPaginationMeta(result.meta);
      } catch {
        if (!isActive) {
          return;
        }

        setHasError(true);
        setCustomers([]);
        setPaginationMeta(DEFAULT_PAGINATION_META);
      } finally {
        if (isActive) {
          setHasLoadedOnce(true);
          setIsLoading(false);
        }
      }
    }

    void loadCustomers();

    return () => {
      isActive = false;
    };
  }, [assignedOperatorFilter, currentPage, ordering, reloadCursor, search]);

  useEffect(() => {
    if (selectedCustomerId === null) {
      return;
    }

    const isSelectedCustomerVisible = customers.some(
      (customer) => customer.id === selectedCustomerId,
    );
    if (!isSelectedCustomerVisible) {
      setSelectedCustomerId(null);
    }
  }, [customers, selectedCustomerId]);

  function openCreateForm() {
    setFormMode('create');
    setEditingCustomer(null);
    setFormErrorMessage(null);
    setIsFormOpen(true);
  }

  function openEditForm(customer: Customer) {
    setFormMode('edit');
    setEditingCustomer(customer);
    setFormErrorMessage(null);
    setIsFormOpen(true);
  }

  function requestDelete(customer: Customer) {
    setCustomerToDelete(customer);
  }

  async function handleSaveCustomer(payload: CustomerMutationInput) {
    setIsSaving(true);
    setFormErrorMessage(null);

    try {
      if (formMode === 'create') {
        await services.customers.createCustomer(payload);
        setCurrentPage(1);
      } else {
        const customerId = editingCustomer?.id;
        if (!customerId) {
          throw new Error(t('customers.form.saveError'));
        }

        const updated = await services.customers.updateCustomer(customerId, payload);
        if (!updated) {
          throw new Error(t('customers.form.saveError'));
        }

        setDetailRefreshToken((current) => current + 1);
      }

      setIsFormOpen(false);
      setEditingCustomer(null);
      setReloadCursor((current) => current + 1);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('customers.form.saveError');
      setFormErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!customerToDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      const deleted = await services.customers.deleteCustomer(customerToDelete.id);
      if (!deleted) {
        throw new Error();
      }

      if (selectedCustomerId === customerToDelete.id) {
        setSelectedCustomerId(null);
      }

      setCustomerToDelete(null);
      setReloadCursor((current) => current + 1);
    } catch {
      // keep delete dialog open when request fails
    } finally {
      setIsDeleting(false);
    }
  }

  const columns = useMemo<DataTableColumn<Customer>[]>(() => {
    const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';
    const baseColumns: DataTableColumn<Customer>[] = [
      {
        key: 'customer',
        label: t('customers.columns.customer'),
        render: (customer) => (
          <div className="grid gap-0.5">
            <span className={TABLE_PRIMARY_TEXT_CLASS_NAME}>
              {customer.fullName}
            </span>
            <span className={TABLE_SECONDARY_TEXT_CLASS_NAME}>
              {customer.lead
                ? `${t('customers.leadPrefix')}: ${customer.lead.fullName}`
                : t('customers.noLeadLink')}
            </span>
          </div>
        ),
      },
      {
        key: 'phone',
        label: t('customers.columns.phone'),
        render: (customer) => (
          <span className={TABLE_PRIMARY_TEXT_CLASS_NAME}>
            {customer.contact.phone ?? t('customers.noPhone')}
          </span>
        ),
      },
      {
        key: 'email',
        label: t('customers.columns.email'),
        render: (customer) => (
          <span className={TABLE_PRIMARY_TEXT_CLASS_NAME}>
            {customer.contact.email ?? t('customers.noEmail')}
          </span>
        ),
      },
      {
        key: 'address',
        label: t('customers.columns.address'),
        render: (customer) => (
          <span className={TABLE_PRIMARY_TEXT_CLASS_NAME}>
            {customer.address
              ? formatAddress(customer.address)
              : t('customers.noAddress')}
          </span>
        ),
      },
      {
        key: 'assignedOperator',
        label: t('customers.columns.operator'),
        render: (customer) => (
          <span className={TABLE_PRIMARY_TEXT_CLASS_NAME}>
            {customer.assignedOperator?.fullName ?? t('common.unassigned')}
          </span>
        ),
      },
      {
        key: 'updatedAt',
        label: t('customers.columns.updated'),
        render: (customer) => (
          <span className={TABLE_PRIMARY_TEXT_CLASS_NAME}>
            {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
              new Date(customer.updatedAt),
            )}
          </span>
        ),
      },
    ];

    if (!canManageCustomers) {
      return baseColumns;
    }

    return [
      ...baseColumns,
      {
        key: 'actions',
        label: t('customers.columns.actions'),
        align: 'right',
        render: (customer) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              className={ACTION_BUTTON_CLASS_NAME}
              onClick={(event) => {
                event.stopPropagation();
                openEditForm(customer);
              }}
              aria-label={`${t('customers.actions.edit')} ${customer.fullName}`}
            >
              <FiEdit2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className={ACTION_BUTTON_CLASS_NAME}
              onClick={(event) => {
                event.stopPropagation();
                requestDelete(customer);
              }}
              aria-label={`${t('customers.actions.delete')} ${customer.fullName}`}
            >
              <FiTrash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      },
    ];
  }, [canManageCustomers, i18n.language, t]);

  const activeFilterCount =
    Number(assignedOperatorFilter !== ALL_OPERATORS_VALUE) +
    Number(ordering !== DEFAULT_ORDERING);

  const header = (
    <PageHeader
      eyebrow={t('customers.eyebrow')}
      title={t('customers.title')}
      subtitle={t('customers.subtitle')}
      actions={
        <div className="flex w-full flex-wrap items-center gap-2 min-[768px]:w-auto">
          {canManageCustomers ? (
            <button
              type="button"
              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              onClick={openCreateForm}
            >
              <AppIcon name="plus" className="h-4 w-4" aria-hidden="true" />
              {t('customers.newCustomer')}
            </button>
          ) : null}
          <span className="inline-flex min-h-8 items-center gap-2 rounded-pill bg-primary/12 px-3 text-[12px] font-semibold text-text-accent">
            <AppIcon
              name="customers"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            />
            {paginationMeta.totalItems} {t('customers.title').toLowerCase()}
          </span>
          {activeFilterCount > 0 ? (
            <span className="inline-flex min-h-8 items-center gap-2 rounded-pill bg-surface-subtle px-3 text-[12px] font-semibold text-text-secondary">
              <AppIcon
                name="filter"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              />
              {activeFilterCount} {t('customers.activeFilters')}
            </span>
          ) : null}
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
              title={t('customers.loadingTitle')}
              description={t('customers.loadingDescription')}
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
              title={t('customers.errorTitle')}
              description={t('customers.errorDescription')}
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
                {paginationMeta.totalItems} {t('customers.records')}
              </span>
              {selectedCustomerId ? (
                <span className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary/12 px-3 text-sm font-semibold text-text-accent">
                  <AppIcon name="user" className="h-4 w-4" aria-hidden="true" />
                  {t('customers.rowSelected')}
                </span>
              ) : null}
            </div>
          }
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t('customers.searchPlaceholder')}
            disabled={isLoading}
          />

          <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_220px]">
            <span className={LABEL_CLASS_NAME}>{t('customers.assignedOperator')}</span>
            <FilterSelect
              value={assignedOperatorFilter}
              options={operatorOptions}
              onChange={setAssignedOperatorFilter}
              disabled={isLoading}
            />
          </label>

          <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_200px]">
            <span className={LABEL_CLASS_NAME}>{t('customers.orderBy')}</span>
            <FilterSelect
              value={ordering}
              options={[
                { value: '-updated_at', label: t('customers.updatedNewest') },
                { value: 'updated_at', label: t('customers.updatedOldest') },
                { value: '-created_at', label: t('customers.createdNewest') },
                { value: 'created_at', label: t('customers.createdOldest') },
              ]}
              onChange={(value) => setOrdering(value as CustomerOrdering)}
              disabled={isLoading}
            />
          </label>
        </FilterBar>

        <PageCard>
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <h2 className="m-0 text-[1rem] font-semibold text-text-primary">
                {t('customers.directoryTitle')}
              </h2>
              <span className="text-[12px] font-medium text-text-muted">
                {t('customers.directoryHint')}
              </span>
            </div>

            <DataTable
              data={customers}
              columns={columns}
              rowKey="id"
              selectedRowKey={selectedCustomerId}
              loading={isLoading}
              onRowClick={(customer) =>
                setSelectedCustomerId((current) =>
                  current === customer.id ? null : customer.id,
                )
              }
              emptyTitle={t('customers.emptyTitle')}
              emptyDescription={t('customers.emptyDescription')}
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

      {selectedCustomerId ? (
        <CustomerDetailPanel
          customerId={selectedCustomerId}
          refreshToken={detailRefreshToken}
          canManageCustomers={canManageCustomers}
          onClose={() => setSelectedCustomerId(null)}
          onEdit={(customer) => {
            openEditForm(customer);
            setSelectedCustomerId(null);
          }}
          onDelete={(customer) => {
            requestDelete(customer);
            setSelectedCustomerId(null);
          }}
        />
      ) : null}

      {isFormOpen ? (
        <CustomerFormPanel
          mode={formMode}
          customer={editingCustomer}
          leadOptions={leadOptions}
          operatorOptions={[
            { value: EMPTY_OPTION_VALUE, label: t('common.unassigned') },
            ...operatorOptions.filter((option) => option.value !== ALL_OPERATORS_VALUE),
          ]}
          isSubmitting={isSaving}
          errorMessage={formErrorMessage}
          onClose={() => {
            if (!isSaving) {
              setIsFormOpen(false);
              setEditingCustomer(null);
              setFormErrorMessage(null);
            }
          }}
          onSubmit={handleSaveCustomer}
        />
      ) : null}

      {customerToDelete ? (
        <CustomerDeleteDialog
          customer={customerToDelete}
          isDeleting={isDeleting}
          onCancel={() => {
            if (!isDeleting) {
              setCustomerToDelete(null);
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

export default CustomersPage;
