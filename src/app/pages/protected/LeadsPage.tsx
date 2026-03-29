import { useEffect, useMemo, useState } from 'react';
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
  PageHeader,
  PageLayout,
  PageSection,
} from '../../../components/shared/page';
import LeadDeleteDialog from '../../../features/leads/components/LeadDeleteDialog';
import LeadDetailPanel from '../../../features/leads/components/LeadDetailPanel';
import LeadFormPanel from '../../../features/leads/components/LeadFormPanel';
import { formatLocalizedDate } from '../../../i18n/date-format';
import { getChannelLabel, getLeadStatusLabel } from '../../../i18n/labels';
import { usePersistentState } from '../../../lib/persistent-state';
import { services } from '../../../services';
import { useAuth } from '../../../auth';
import type {
  EntityId,
  Lead,
  LeadMutationInput,
  LeadSource,
  LeadStatus,
  PaginationMeta,
  SelectOption,
  TableQueryParams,
} from '../../../types/domain';

type LeadStatusFilter = LeadStatus | 'all';
type LeadSourceFilter = LeadSource | 'all';
type LeadOrdering = '-updated_at' | 'updated_at' | '-created_at' | 'created_at';

const PAGE_SIZE = 8;
const SERVICE_FETCH_SIZE = 300;
const SEARCH_DEBOUNCE_MS = 350;
const DEFAULT_ORDERING: LeadOrdering = '-updated_at';
const ALL_OPERATORS_VALUE = 'all';
const STATUS_VALUES: readonly LeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'negotiating',
  'converted',
  'lost',
];
const SOURCE_VALUES: readonly LeadSource[] = [
  'manual',
  'telegram',
  'instagram',
];

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

const UNASSIGNED_OPERATOR_VALUE = '';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuidLike(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return UUID_PATTERN.test(value);
}

function formatDate(
  timestamp: string | undefined,
  locale: string,
  fallback: string,
): string {
  return formatLocalizedDate(timestamp, locale, {
    locale,
    withYear: true,
    shortMonth: true,
    fallback,
  });
}

function normalizeLeadSource(source: LeadSource): LeadSource {
  if (source === 'website' || source === 'web') {
    return 'manual';
  }

  return source;
}

function formatRelativeTime(
  timestamp: string | undefined,
  locale: string,
  fallback: string,
): string {
  if (!timestamp) {
    return fallback;
  }

  const target = new Date(timestamp).getTime();
  if (Number.isNaN(target)) {
    return fallback;
  }

  const delta = target - Date.now();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(delta) < hour) {
    return formatter.format(Math.round(delta / minute), 'minute');
  }

  if (Math.abs(delta) < day) {
    return formatter.format(Math.round(delta / hour), 'hour');
  }

  return formatter.format(Math.round(delta / day), 'day');
}

function channelAbbreviation(source: LeadSource): string {
  switch (normalizeLeadSource(source)) {
    case 'instagram':
      return 'IG';
    case 'telegram':
      return 'TG';
    case 'manual':
      return 'MN';
    default:
      return 'OTR';
  }
}

function getLeadStatusTone(status: LeadStatus): 'info' | 'warning' | 'accent' | 'success' | 'danger' {
  switch (status) {
    case 'new':
      return 'info';
    case 'contacted':
      return 'warning';
    case 'qualified':
      return 'accent';
    case 'negotiating':
      return 'warning';
    case 'converted':
      return 'success';
    case 'lost':
      return 'danger';
    default:
      return 'info';
  }
}

function parseOrdering(ordering: LeadOrdering): Pick<
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

function LeadsPage() {
  const { t, i18n } = useTranslation();
  const { hasPermission, currentUser } = useAuth();
  const canManageLeads = hasPermission('can_manage_leads');
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';
  const relativeLocale = i18n.language === 'ru' ? 'ru' : 'uz';

  const allOperatorsOption = useMemo<SelectOption>(
    () => ({
      value: ALL_OPERATORS_VALUE,
      label: t('leads.allOperators'),
    }),
    [t],
  );

  const statusOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'all', label: t('leads.allStatuses') },
      ...STATUS_VALUES.map((status) => ({
        value: status,
        label: getLeadStatusLabel(t, status),
      })),
    ],
    [t],
  );

  const sourceOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'all', label: t('leads.allChannels') },
      ...SOURCE_VALUES.map((source) => ({
        value: source,
        label: getChannelLabel(t, source),
      })),
    ],
    [t],
  );

  const orderingOptions = useMemo<SelectOption[]>(
    () => [
      { value: '-updated_at', label: t('leads.updatedNewest') },
      { value: 'updated_at', label: t('leads.updatedOldest') },
      { value: '-created_at', label: t('leads.createdNewest') },
      { value: 'created_at', label: t('leads.createdOldest') },
    ],
    [t],
  );

  const [search, setSearch] = usePersistentState('leads:search', '');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<LeadSourceFilter>('all');
  const [assignedOperatorFilter, setAssignedOperatorFilter] =
    useState<string>(ALL_OPERATORS_VALUE);
  const [ordering, setOrdering] = useState<LeadOrdering>(DEFAULT_ORDERING);
  const [currentPage, setCurrentPage] = useState(1);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>(
    DEFAULT_PAGINATION_META,
  );
  const [selectedLeadId, setSelectedLeadId] = useState<EntityId | null>(null);
  const [operatorOptions, setOperatorOptions] = useState<SelectOption[]>([
    allOperatorsOption,
  ]);
  const [operatorNameById, setOperatorNameById] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [detailRefreshToken, setDetailRefreshToken] = useState(0);
  const [reloadCursor, setReloadCursor] = useState(0);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);

  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
  }, [debouncedSearch, statusFilter, sourceFilter, assignedOperatorFilter, ordering]);

  useEffect(() => {
    let isActive = true;

    async function loadOperatorOptions() {
      const [usersResult, leadsResult] = await Promise.allSettled([
        services.users.listUsers({
          page: 1,
          pageSize: SERVICE_FETCH_SIZE,
          ordering: 'full_name',
        }),
        services.leads.listLeads({
          page: 1,
          pageSize: SERVICE_FETCH_SIZE,
          ordering: '-updated_at',
        }),
      ]);

      if (!isActive) {
        return;
      }

      const operatorsById = new Map<string, string>();

      if (usersResult.status === 'fulfilled') {
        usersResult.value.items.forEach((operator) => {
          if (operator.full_name) {
            operatorsById.set(operator.id, operator.full_name);
          }
        });
      }

      if (leadsResult.status === 'fulfilled') {
        leadsResult.value.items.forEach((lead) => {
          if (!lead.assignedOperator?.id) {
            return;
          }

          const fallbackName = lead.assignedOperator.fullName;
          if (!isUuidLike(fallbackName) && fallbackName) {
            operatorsById.set(lead.assignedOperator.id, fallbackName);
          }
        });
      }

      if (currentUser?.role === 'operator') {
        operatorsById.set(currentUser.id, currentUser.fullName);
      }

      const nextOptions: SelectOption[] = [
        allOperatorsOption,
        ...Array.from(operatorsById.entries())
          .sort((left, right) => left[1].localeCompare(right[1]))
          .map(([value, label]) => ({ value, label })),
      ];

      setOperatorNameById(new Map(operatorsById));
      setOperatorOptions(nextOptions);
    }

    void loadOperatorOptions();

    return () => {
      isActive = false;
    };
  }, [allOperatorsOption, currentUser, reloadCursor]);

  const leadsWithOperatorNames = useMemo<Lead[]>(() => {
    if (operatorNameById.size === 0) {
      return leads;
    }

    return leads.map((lead) => {
      const assignedOperator = lead.assignedOperator;
      if (!assignedOperator?.id) {
        return lead;
      }

      const resolvedName = operatorNameById.get(assignedOperator.id);
      if (!resolvedName || resolvedName === assignedOperator.fullName) {
        return lead;
      }

      return {
        ...lead,
        assignedOperator: {
          ...assignedOperator,
          fullName: resolvedName,
        },
      };
    });
  }, [leads, operatorNameById]);

  useEffect(() => {
    let isActive = true;

    async function loadLeads() {
      setIsLoading(true);
      setHasError(false);

      try {
        const sortConfig = parseOrdering(ordering);
        const result = await services.leads.listLeads({
          page: currentPage,
          pageSize: PAGE_SIZE,
          search: debouncedSearch || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
          source: sourceFilter === 'all' ? undefined : sourceFilter,
          assigned_operator:
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

        setLeads(result.items);
        setPaginationMeta(result.meta);

        const unresolvedOperatorIds = Array.from(
          new Set(
            result.items
              .map((lead) => lead.assignedOperator)
              .filter(
                (assignedOperator): assignedOperator is NonNullable<Lead['assignedOperator']> =>
                  Boolean(
                    assignedOperator?.id &&
                      (!assignedOperator.fullName || isUuidLike(assignedOperator.fullName)),
                  ),
              )
              .map((assignedOperator) => assignedOperator.id),
          ),
        );

        if (unresolvedOperatorIds.length > 0) {
          void (async () => {
            const resolvedEntries = await Promise.all(
              unresolvedOperatorIds.map(async (operatorId) => {
                try {
                  const user = await services.users.getUserById(operatorId);
                  return [operatorId, user?.full_name ?? null] as const;
                } catch {
                  return [operatorId, null] as const;
                }
              }),
            );

            if (!isActive) {
              return;
            }

            setOperatorNameById((current) => {
              const next = new Map(current);
              let changed = false;

              for (const [operatorId, operatorName] of resolvedEntries) {
                if (!operatorName || isUuidLike(operatorName)) {
                  continue;
                }

                if (next.get(operatorId) !== operatorName) {
                  next.set(operatorId, operatorName);
                  changed = true;
                }
              }

              return changed ? next : current;
            });
          })();
        }
      } catch {
        if (!isActive) {
          return;
        }

        setHasError(true);
        setLeads([]);
        setPaginationMeta(DEFAULT_PAGINATION_META);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadLeads();

    return () => {
      isActive = false;
    };
  }, [
    assignedOperatorFilter,
    currentPage,
    debouncedSearch,
    ordering,
    reloadCursor,
    sourceFilter,
    statusFilter,
  ]);

  useEffect(() => {
    if (selectedLeadId === null) {
      return;
    }

    const isSelectedLeadVisible = leadsWithOperatorNames.some(
      (lead) => lead.id === selectedLeadId,
    );
    if (!isSelectedLeadVisible) {
      setSelectedLeadId(null);
    }
  }, [leadsWithOperatorNames, selectedLeadId]);

  const operatorSelectOptions = useMemo<SelectOption[]>(
    () => [
      { value: UNASSIGNED_OPERATOR_VALUE, label: t('common.unassigned') },
      ...operatorOptions.filter((option) => option.value !== ALL_OPERATORS_VALUE),
    ],
    [operatorOptions, t],
  );

  function openCreateForm() {
    setFormMode('create');
    setEditingLead(null);
    setFormErrorMessage(null);
    setIsFormOpen(true);
  }

  function openEditForm(lead: Lead) {
    setFormMode('edit');
    setEditingLead(lead);
    setFormErrorMessage(null);
    setIsFormOpen(true);
  }

  function requestDelete(lead: Lead) {
    setLeadToDelete(lead);
  }

  async function handleSaveLead(payload: LeadMutationInput) {
    setIsSaving(true);
    setFormErrorMessage(null);

    try {
      if (formMode === 'create') {
        await services.leads.createLead(payload);
        setCurrentPage(1);
      } else {
        const editId = editingLead?.id;
        if (!editId) {
          throw new Error(t('leads.form.saveError'));
        }

        const updated = await services.leads.updateLead(editId, payload);
        if (!updated) {
          throw new Error(t('leads.form.saveError'));
        }

        setDetailRefreshToken((current) => current + 1);
      }

      setIsFormOpen(false);
      setEditingLead(null);
      setReloadCursor((current) => current + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('leads.form.saveError');
      setFormErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!leadToDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      const deleted = await services.leads.deleteLead(leadToDelete.id);
      if (!deleted) {
        throw new Error();
      }

      if (selectedLeadId === leadToDelete.id) {
        setSelectedLeadId(null);
      }

      setLeadToDelete(null);
      setReloadCursor((current) => current + 1);
    } catch {
      // keep modal open if deletion fails
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleStatusChange(
    id: EntityId,
    status: LeadStatus,
  ): Promise<Lead | null> {
    const updated = await services.leads.patchLead(id, { status });
    if (!updated) {
      return null;
    }

    setLeads((current) =>
      current.map((lead) => (lead.id === id ? updated : lead)),
    );
    setDetailRefreshToken((current) => current + 1);

    return updated;
  }

  const columns = useMemo<DataTableColumn<Lead>[]>(() => {
    const baseColumns: DataTableColumn<Lead>[] = [
      {
        key: 'lead',
        label: t('leads.lead'),
        render: (lead) => (
          <div className="grid gap-0.5">
            <span className={tablePrimaryTextClassName}>{lead.fullName}</span>
            <span className={tableSecondaryTextClassName}>
              @
              {lead.username ??
                lead.instagramUsername ??
                lead.telegramUsername ??
                t('leads.unknownHandle')}
            </span>
          </div>
        ),
      },
      {
        key: 'contact',
        label: t('leads.contact'),
        render: (lead) => (
          <div className="grid gap-0.5">
            <span className={tablePrimaryTextClassName}>
              {lead.contact.phone ?? t('leads.noPhone')}
            </span>
          </div>
        ),
      },
      {
        key: 'source',
        label: t('leads.source'),
        render: (lead) => {
          const normalizedSource = normalizeLeadSource(lead.source);

          return (
            <div className="grid gap-0.5">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-info-bg px-1 text-[10px] font-semibold text-info">
                  {channelAbbreviation(normalizedSource)}
                </span>
                {getChannelLabel(t, normalizedSource)}
              </span>
              <span className={tableSecondaryTextClassName}>
                {lead.dmSent ? t('leads.dmSent') : t('leads.awaitingOutreach')}
              </span>
            </div>
          );
        },
      },
      {
        key: 'status',
        label: t('leads.status'),
        render: (lead) => (
          <StatusBadge
            status={lead.status}
            label={getLeadStatusLabel(t, lead.status)}
            tone={getLeadStatusTone(lead.status)}
          />
        ),
      },
      {
        key: 'owner',
        label: t('leads.owner'),
        render: (lead) => (
          <div className="grid gap-0.5">
            <span className={tablePrimaryTextClassName}>
              {lead.assignedOperator?.fullName ?? t('common.unassigned')}
            </span>
            <span className={tableSecondaryTextClassName}>
              {lead.replied ? t('leads.replied') : t('leads.awaitingReply')}
            </span>
          </div>
        ),
      },
      {
        key: 'createdAt',
        label: t('leads.detail.created'),
        render: (lead) => (
          <div className="grid gap-0.5">
            <span className={tablePrimaryTextClassName}>
              {formatDate(lead.createdAt, locale, t('common.na'))}
            </span>
            <span className={tableSecondaryTextClassName}>
              {formatRelativeTime(lead.createdAt, relativeLocale, t('common.na'))}
            </span>
          </div>
        ),
      },
    ];

    if (!canManageLeads) {
      return baseColumns;
    }

    return [
      ...baseColumns,
      {
        key: 'actions',
        label: t('leads.actions.column'),
        align: 'right',
        render: (lead) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              className={actionButtonClassName}
              onClick={(event) => {
                event.stopPropagation();
                openEditForm(lead);
              }}
              aria-label={`${t('leads.actions.edit')} ${lead.fullName}`}
            >
              <FiEdit2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className={actionButtonClassName}
              onClick={(event) => {
                event.stopPropagation();
                requestDelete(lead);
              }}
              aria-label={`${t('leads.actions.delete')} ${lead.fullName}`}
            >
              <FiTrash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      },
    ];
  }, [canManageLeads, locale, relativeLocale, t]);

  const activeFilterCount =
    Number(statusFilter !== 'all') +
    Number(sourceFilter !== 'all') +
    Number(assignedOperatorFilter !== ALL_OPERATORS_VALUE) +
    Number(ordering !== DEFAULT_ORDERING);

  const header = (
    <PageHeader
      eyebrow={t('leads.pipelineEyebrow')}
      title={t('leads.title')}
      subtitle={t('leads.subtitle')}
      actions={
        <div className="flex w-full flex-wrap items-center gap-2 min-[768px]:w-auto">
          {canManageLeads ? (
            <button
              type="button"
              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              onClick={openCreateForm}
            >
              <AppIcon name="plus" className="h-4 w-4" aria-hidden="true" />
              {t('leads.newLead')}
            </button>
          ) : null}
          <span className="inline-flex min-h-8 items-center gap-2 rounded-pill bg-primary/12 px-3 text-[12px] font-semibold text-text-accent">
            <AppIcon name="leads" className="h-3.5 w-3.5" aria-hidden="true" />
            {paginationMeta.totalItems} {t('leads.visible')}
          </span>
          {activeFilterCount > 0 ? (
            <span className="inline-flex min-h-8 items-center gap-2 rounded-pill bg-surface-subtle px-3 text-[12px] font-semibold text-text-secondary">
              <AppIcon name="filter" className="h-3.5 w-3.5" aria-hidden="true" />
              {activeFilterCount} {t('leads.filters')}
            </span>
          ) : null}
        </div>
      }
    />
  );

  if (hasError) {
    return (
      <PageLayout header={header}>
        <EmptyState
          title={t('leads.errorTitle')}
          description={t('leads.errorDescription')}
        />
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
                {paginationMeta.totalItems} {t('leads.count')}
              </span>
              {selectedLeadId ? (
                <span className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary/12 px-3 text-sm font-semibold text-text-accent">
                  <AppIcon
                    name="user"
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                  {t('leads.detailOpen')}
                </span>
              ) : null}
            </div>
          }
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t('leads.searchPlaceholder')}
          />

          <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_200px]">
            <span className={labelClassName}>
              {t('leads.status')}
            </span>
            <FilterSelect
              value={statusFilter}
              options={statusOptions}
              onChange={(value) => setStatusFilter(value as LeadStatusFilter)}
              disabled={isLoading}
            />
          </label>

          <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_200px]">
            <span className={labelClassName}>
              {t('leads.channel')}
            </span>
            <FilterSelect
              value={sourceFilter}
              options={sourceOptions}
              onChange={(value) => setSourceFilter(value as LeadSourceFilter)}
              disabled={isLoading}
            />
          </label>

          <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_220px]">
            <span className={labelClassName}>
              {t('leads.assignedOperator')}
            </span>
            <FilterSelect
              value={assignedOperatorFilter}
              options={operatorOptions}
              onChange={setAssignedOperatorFilter}
              disabled={isLoading}
            />
          </label>

          <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_220px]">
            <span className={labelClassName}>
              {t('leads.orderBy')}
            </span>
            <FilterSelect
              value={ordering}
              options={orderingOptions}
              onChange={(value) => setOrdering(value as LeadOrdering)}
              disabled={isLoading}
            />
          </label>
        </FilterBar>

        <div className="grid min-w-0 gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <h2 className="m-0 text-[1rem] font-semibold text-text-primary">
              {t('leads.queueTitle')}
            </h2>
            <span className="text-[12px] font-medium text-text-muted">
              {t('leads.queueHint')}
            </span>
          </div>

          <div className="min-w-0 [&_.data-table__row--clickable:hover_.status-badge]:-translate-y-px">
            <DataTable
              data={leadsWithOperatorNames}
              columns={columns}
              rowKey="id"
              selectedRowKey={selectedLeadId}
              loading={isLoading}
              onRowClick={(lead) => setSelectedLeadId(lead.id)}
              emptyTitle={t('leads.emptyTitle')}
              emptyDescription={t('leads.emptyDescription')}
            />
          </div>
        </div>

        {!isLoading && paginationMeta.totalItems > 0 ? (
          <Pagination
            currentPage={Math.min(currentPage, paginationMeta.totalPages)}
            totalPages={paginationMeta.totalPages}
            totalItems={paginationMeta.totalItems}
            onPageChange={setCurrentPage}
          />
        ) : null}
      </PageSection>

      {selectedLeadId ? (
        <LeadDetailPanel
          leadId={selectedLeadId}
          refreshToken={detailRefreshToken}
          canManageLeads={canManageLeads}
          onClose={() => setSelectedLeadId(null)}
          onEdit={(lead) => {
            openEditForm(lead);
            setSelectedLeadId(null);
          }}
          onDelete={(lead) => {
            requestDelete(lead);
            setSelectedLeadId(null);
          }}
          onStatusChange={handleStatusChange}
          resolveOperatorName={(operatorId, fallbackName) =>
            operatorNameById.get(operatorId) ?? fallbackName
          }
        />
      ) : null}

      {isFormOpen ? (
        <LeadFormPanel
          mode={formMode}
          lead={editingLead}
          sourceOptions={sourceOptions.filter((option) => option.value !== 'all')}
          statusOptions={statusOptions.filter((option) => option.value !== 'all')}
          operatorOptions={operatorSelectOptions}
          isSubmitting={isSaving}
          errorMessage={formErrorMessage}
          onClose={() => {
            if (!isSaving) {
              setIsFormOpen(false);
              setEditingLead(null);
              setFormErrorMessage(null);
            }
          }}
          onSubmit={handleSaveLead}
        />
      ) : null}

      {leadToDelete ? (
        <LeadDeleteDialog
          lead={leadToDelete}
          isDeleting={isDeleting}
          onCancel={() => {
            if (!isDeleting) {
              setLeadToDelete(null);
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

export default LeadsPage;
