import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DataTable,
  FilterBar,
  FilterSelect,
  Pagination,
  SearchInput,
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
import { services } from '../../../services';
import type {
  Customer,
  EntityId,
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
const DEFAULT_ORDERING: CustomerOrdering = '-updated_at';

const TABLE_PRIMARY_TEXT_CLASS_NAME =
  'block text-sm font-semibold leading-[1.35] text-text-primary [overflow-wrap:anywhere]';

const TABLE_SECONDARY_TEXT_CLASS_NAME =
  'block text-[12px] leading-[1.45] text-text-secondary [overflow-wrap:anywhere]';

const LABEL_CLASS_NAME =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

const DEFAULT_PAGINATION_META: PaginationMeta = {
  page: 1,
  pageSize: PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
};

function formatAddress(address: NonNullable<Customer['address']>): string {
  const parts = [
    address.line1,
    address.city,
    address.region,
  ].filter(Boolean);

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
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, assignedOperatorFilter, ordering]);

  useEffect(() => {
    let isActive = true;

    async function loadOperatorOptions() {
      try {
        const result = await services.customers.list({
          page: 1,
          pageSize: SERVICE_FETCH_SIZE,
          ordering: '-updated_at',
        });

        if (!isActive) {
          return;
        }

        const operatorsById = new Map<string, string>();
        result.items.forEach((customer) => {
          if (!customer.assignedOperator) {
            return;
          }

          operatorsById.set(
            customer.assignedOperator.id,
            customer.assignedOperator.fullName,
          );
        });

        const options: SelectOption[] = [
          allOperatorsOption,
          ...Array.from(operatorsById.entries())
            .sort((left, right) => left[1].localeCompare(right[1]))
            .map(([value, label]) => ({ value, label })),
        ];
        setOperatorOptions(options);
      } catch {
        if (!isActive) {
          return;
        }

        setOperatorOptions([allOperatorsOption]);
      }
    }

    void loadOperatorOptions();

    return () => {
      isActive = false;
    };
  }, [allOperatorsOption]);

  useEffect(() => {
    let isActive = true;

    async function loadCustomers() {
      setIsLoading(true);
      setHasError(false);

      try {
        const sortConfig = parseOrdering(ordering);
        const result = await services.customers.list({
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
  }, [assignedOperatorFilter, currentPage, ordering, search]);

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

  const columns = useMemo(() => {
    const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';

    return [
      {
        key: 'customer',
        label: t('customers.columns.customer'),
        render: (customer: Customer) => (
          <div className="grid gap-0.5">
            <span className={TABLE_PRIMARY_TEXT_CLASS_NAME}>
              {customer.fullName}
            </span>
            <span className={TABLE_SECONDARY_TEXT_CLASS_NAME}>
              {customer.contact.email ?? t('customers.noEmail')}
            </span>
          </div>
        ),
      },
      {
        key: 'phone',
        label: t('customers.columns.phone'),
        render: (customer: Customer) => (
          <div className="grid gap-0.5">
            <span className={TABLE_PRIMARY_TEXT_CLASS_NAME}>
              {customer.contact.phone ?? t('customers.noPhone')}
            </span>
            <span className={TABLE_SECONDARY_TEXT_CLASS_NAME}>
              {customer.notesSummary ?? t('customers.noNotes')}
            </span>
          </div>
        ),
      },
      {
        key: 'address',
        label: t('customers.columns.address'),
        render: (customer: Customer) => (
          <div className="grid gap-0.5">
            <span className={TABLE_PRIMARY_TEXT_CLASS_NAME}>
              {customer.address
                ? formatAddress(customer.address)
                : t('customers.noAddress')}
            </span>
            <span className={TABLE_SECONDARY_TEXT_CLASS_NAME}>
              {customer.address?.country ?? t('customers.defaultCountry')}
            </span>
          </div>
        ),
      },
      {
        key: 'assignedOperator',
        label: t('customers.columns.operator'),
        render: (customer: Customer) => (
          <div className="grid gap-0.5">
            <span className={TABLE_PRIMARY_TEXT_CLASS_NAME}>
              {customer.assignedOperator?.fullName ?? t('common.unassigned')}
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
        key: 'createdAt',
        label: t('customers.columns.created'),
        render: (customer: Customer) => (
          <span className={TABLE_PRIMARY_TEXT_CLASS_NAME}>
            {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
              new Date(customer.createdAt),
            )}
          </span>
        ),
      },
      {
        key: 'updatedAt',
        label: t('customers.columns.updated'),
        render: (customer: Customer) => (
          <span className={TABLE_PRIMARY_TEXT_CLASS_NAME}>
            {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
              new Date(customer.updatedAt),
            )}
          </span>
        ),
      },
    ];
  }, [i18n.language, t]);

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
    </PageLayout>
  );
}

export default CustomersPage;
