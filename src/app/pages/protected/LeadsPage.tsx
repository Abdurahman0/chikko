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
import { getChannelLabel, getLeadStatusLabel } from '../../../i18n/labels';
import { services } from '../../../services';
import { useAuth } from '../../../auth';
import type {
  EntityId,
  Lead,
  LeadMutationInput,
  LeadSource,
  LeadStatus,
  SelectOption,
} from '../../../types/domain';

type LeadStatusFilter = LeadStatus | 'all';
type LeadSourceFilter = LeadSource | 'all';

const PAGE_SIZE = 8;
const SERVICE_FETCH_SIZE = 300;
const STATUS_VALUES: readonly LeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'negotiating',
  'converted',
  'lost',
];
const SOURCE_VALUES: readonly LeadSource[] = [
  'telegram',
  'instagram',
  'manual',
  'website',
  'web',
];

const tablePrimaryTextClassName =
  'block text-sm font-semibold leading-[1.35] text-text-primary [overflow-wrap:anywhere]';

const tableSecondaryTextClassName =
  'block text-[12px] leading-[1.45] text-text-secondary [overflow-wrap:anywhere]';

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

const actionButtonClassName =
  'inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface-card text-text-secondary shadow-sm ring-1 ring-border-soft/40 transition duration-fast hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20';

const UNASSIGNED_OPERATOR_VALUE = '';

function formatDate(
  timestamp: string | undefined,
  locale: string,
  fallback: string,
): string {
  if (!timestamp) {
    return fallback;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
  }).format(new Date(timestamp));
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
  switch (source) {
    case 'instagram':
      return 'IG';
    case 'telegram':
      return 'TG';
    case 'manual':
      return 'MN';
    case 'website':
      return 'WEB';
    case 'web':
      return 'WB';
    default:
      return 'OTR';
  }
}

function leadSearchValue(lead: Lead): string {
  return [
    lead.fullName,
    lead.contact.phone ?? '',
    lead.contact.email ?? '',
    lead.instagramUsername ?? '',
    lead.telegramUsername ?? '',
    lead.username ?? '',
    lead.status,
    lead.source,
  ]
    .join(' ')
    .toLowerCase();
}

function matchesSearch(lead: Lead, search: string): boolean {
  const normalized = search.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return leadSearchValue(lead).includes(normalized);
}

function LeadsPage() {
  const { t, i18n } = useTranslation();
  const { hasPermission, currentUser } = useAuth();
  const canManageLeads = hasPermission('can_manage_leads');
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';
  const relativeLocale = i18n.language === 'ru' ? 'ru' : 'uz';
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

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<LeadSourceFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<EntityId | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [detailRefreshToken, setDetailRefreshToken] = useState(0);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);

  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadLeads() {
      setIsLoading(true);
      setHasError(false);

      try {
        const result = await services.leads.list({
          page: 1,
          pageSize: SERVICE_FETCH_SIZE,
          search,
        });

        if (!isActive) {
          return;
        }

        setLeads(result.items);
      } catch {
        if (!isActive) {
          return;
        }

        setHasError(true);
        setLeads([]);
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
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, sourceFilter]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesStatus =
        statusFilter === 'all' || lead.status === statusFilter;
      const matchesSource =
        sourceFilter === 'all' || lead.source === sourceFilter;

      return matchesStatus && matchesSource;
    });
  }, [leads, sourceFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const activeFilterCount =
    Number(statusFilter !== 'all') + Number(sourceFilter !== 'all');

  const paginatedLeads = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * PAGE_SIZE;
    return filteredLeads.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, filteredLeads, totalPages]);

  const operatorSelectOptions = useMemo<SelectOption[]>(() => {
    const operatorMap = new Map<string, string>();

    leads.forEach((lead) => {
      if (lead.assignedOperator?.id && lead.assignedOperator.fullName) {
        operatorMap.set(lead.assignedOperator.id, lead.assignedOperator.fullName);
      }
    });

    if (currentUser?.role === 'operator') {
      operatorMap.set(currentUser.id, currentUser.fullName);
    }

    const options = Array.from(operatorMap.entries())
      .sort((left, right) => left[1].localeCompare(right[1]))
      .map(([value, label]) => ({ value, label }));

    return [
      { value: UNASSIGNED_OPERATOR_VALUE, label: t('common.unassigned') },
      ...options,
    ];
  }, [currentUser, leads, t]);

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
        const created = await services.leads.create(payload);
        setLeads((current) => {
          if (!matchesSearch(created, search)) {
            return current;
          }

          return [created, ...current];
        });
        setCurrentPage(1);
      } else {
        const editId = editingLead?.id;
        if (!editId) {
          throw new Error(t('leads.form.saveError'));
        }

        const updated = await services.leads.update(editId, payload);
        if (!updated) {
          throw new Error(t('leads.form.saveError'));
        }

        setLeads((current) => {
          const hasExisting = current.some((lead) => lead.id === editId);
          const nextMatchesSearch = matchesSearch(updated, search);

          if (!hasExisting) {
            return nextMatchesSearch ? [updated, ...current] : current;
          }

          if (!nextMatchesSearch) {
            return current.filter((lead) => lead.id !== editId);
          }

          return current.map((lead) => (lead.id === editId ? updated : lead));
        });
        setDetailRefreshToken((current) => current + 1);
      }

      setIsFormOpen(false);
      setEditingLead(null);
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
      const deleted = await services.leads.delete(leadToDelete.id);
      if (!deleted) {
        throw new Error();
      }

      setLeads((current) => current.filter((lead) => lead.id !== leadToDelete.id));
      if (selectedLeadId === leadToDelete.id) {
        setSelectedLeadId(null);
      }
      setLeadToDelete(null);
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
    const updated = await services.leads.patch(id, { status });
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
            <span className={tableSecondaryTextClassName}>
              {lead.contact.email ?? t('leads.noEmail')}
            </span>
          </div>
        ),
      },
      {
        key: 'source',
        label: t('leads.source'),
        render: (lead) => (
          <div className="grid gap-0.5">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-primary">
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-info-bg px-1 text-[10px] font-semibold text-info">
                {channelAbbreviation(lead.source)}
              </span>
              {getChannelLabel(t, lead.source)}
            </span>
            <span className={tableSecondaryTextClassName}>
              {lead.dmSent ? t('leads.dmSent') : t('leads.awaitingOutreach')}
            </span>
          </div>
        ),
      },
      {
        key: 'status',
        label: t('leads.status'),
        render: (lead) => (
          <StatusBadge
            status={lead.status}
            label={getLeadStatusLabel(t, lead.status)}
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
        key: 'activity',
        label: t('leads.lastActivity'),
        render: (lead) => {
          const lastActivity = lead.lastContactAt ?? lead.updatedAt;
          return (
            <div className="grid gap-0.5">
              <span className={tablePrimaryTextClassName}>
                {formatRelativeTime(lastActivity, relativeLocale, t('common.na'))}
              </span>
              <span className={tableSecondaryTextClassName}>
                {formatDate(lastActivity, locale, t('common.na'))}
              </span>
            </div>
          );
        },
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
            {filteredLeads.length} {t('leads.visible')}
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
                {filteredLeads.length} {t('leads.count')}
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
            disabled={isLoading}
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
        </FilterBar>

        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <h2 className="m-0 text-[1rem] font-semibold text-text-primary">
              {t('leads.queueTitle')}
            </h2>
            <span className="text-[12px] font-medium text-text-muted">
              {t('leads.queueHint')}
            </span>
          </div>

          <div className="[&_.data-table__row--clickable:hover_.status-badge]:-translate-y-px">
            <DataTable
              data={paginatedLeads}
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

        {!isLoading && filteredLeads.length > 0 ? (
          <Pagination
            currentPage={Math.min(currentPage, totalPages)}
            totalPages={totalPages}
            totalItems={filteredLeads.length}
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
