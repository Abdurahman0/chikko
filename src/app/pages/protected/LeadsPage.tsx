import { useEffect, useMemo, useState } from 'react';
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_OPTIONS,
  PLATFORM_CHANNEL_LABELS,
  PLATFORM_CHANNEL_OPTIONS,
} from '../../../constants';
import {
  DataTable,
  FilterBar,
  FilterSelect,
  Pagination,
  SearchInput,
  StatusBadge,
} from '../../../components/shared/data';
import AppIcon from '../../../components/shared/icons/AppIcon';
import {
  EmptyState,
  PageHeader,
  PageLayout,
  PageSection,
} from '../../../components/shared/page';
import { services } from '../../../services';
import type {
  EntityId,
  Lead,
  LeadStatus,
  PlatformChannel,
} from '../../../types/domain';
import LeadDetailPanel from '../../../features/leads/components/LeadDetailPanel';

type LeadStatusFilter = LeadStatus | 'all';
type LeadSourceFilter = PlatformChannel | 'all';

const PAGE_SIZE = 8;
const SERVICE_FETCH_SIZE = 250;

const leadsChipClassName =
  'inline-flex min-h-8 items-center gap-2 rounded-pill border border-border-soft bg-background-elevated/88 px-3 text-[12px] font-semibold text-text-secondary shadow-sm';

const leadsAccentChipClassName =
  'inline-flex min-h-8 items-center gap-2 rounded-pill border border-border-accent bg-primary-soft px-3 text-[12px] font-semibold text-text-accent shadow-sm';

const leadsSoftChipClassName =
  'inline-flex min-h-8 items-center gap-2 rounded-pill border border-border-soft bg-background-subtle/90 px-3 text-[12px] font-semibold text-text-secondary shadow-sm';

const tablePrimaryTextClassName =
  'table-cell-primary block font-semibold leading-[1.35] text-text-primary [overflow-wrap:anywhere]';

const tableSecondaryTextClassName =
  'block text-[12px] leading-[1.45] text-text-secondary [overflow-wrap:anywhere]';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  ...LEAD_STATUS_OPTIONS,
];

const SOURCE_FILTER_OPTIONS = [
  { value: 'all', label: 'All channels' },
  ...PLATFORM_CHANNEL_OPTIONS,
];

function formatDate(timestamp?: string): string {
  if (!timestamp) {
    return 'Unavailable';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(new Date(timestamp));
}

function LeadsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<LeadSourceFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<EntityId | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

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

  const columns = useMemo(() => {
    return [
      {
        key: 'fullName',
        label: 'Lead',
        render: (lead: Lead) => (
          <div className="grid gap-1">
            <span className={tablePrimaryTextClassName}>{lead.fullName}</span>
            <span className={tableSecondaryTextClassName}>
              {lead.username ?? lead.contact.username ?? 'No handle'}
            </span>
          </div>
        ),
      },
      {
        key: 'contact',
        label: 'Contact',
        render: (lead: Lead) => (
          <div className="grid gap-1">
            <span className={tablePrimaryTextClassName}>
              {lead.contact.phone ?? 'No phone'}
            </span>
            <span className={tableSecondaryTextClassName}>
              {lead.contact.email ?? 'No email'}
            </span>
          </div>
        ),
      },
      {
        key: 'source',
        label: 'Source',
        render: (lead: Lead) => (
          <div className="grid gap-1">
            <span className={tablePrimaryTextClassName}>
              {PLATFORM_CHANNEL_LABELS[lead.source]}
            </span>
            <span className={tableSecondaryTextClassName}>
              {lead.dmSent ? 'DM sent' : 'Awaiting outreach'}
            </span>
          </div>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        render: (lead: Lead) => (
          <StatusBadge
            status={lead.status}
            label={LEAD_STATUS_LABELS[lead.status]}
          />
        ),
      },
      {
        key: 'operator',
        label: 'Owner',
        render: (lead: Lead) => (
          <div className="grid gap-1">
            <span className={tablePrimaryTextClassName}>
              {lead.assignedOperator?.fullName ?? 'Unassigned'}
            </span>
            <span className={tableSecondaryTextClassName}>
              {lead.replied ? 'Replied' : 'Awaiting reply'}
            </span>
          </div>
        ),
      },
      {
        key: 'timestamps',
        label: 'Timeline',
        render: (lead: Lead) => (
          <div className="grid gap-1">
            <span className={tablePrimaryTextClassName}>
              Created {formatDate(lead.createdAt)}
            </span>
            <span className={tableSecondaryTextClassName}>
              Last contact {formatDate(lead.lastContactAt ?? lead.updatedAt)}
            </span>
          </div>
        ),
      },
    ];
  }, []);

  const header = (
    <PageHeader
      eyebrow="CRM"
      title="Leads"
      subtitle="Search, qualify, and review inbound leads from one queue."
      actions={
        <div className="flex w-full flex-wrap items-center gap-2 min-[768px]:w-auto">
          <span className={leadsAccentChipClassName}>
            <AppIcon name="leads" className="h-3.5 w-3.5" aria-hidden="true" />
            Pipeline
          </span>
          <span className={leadsChipClassName}>
            <AppIcon name="dashboard" className="h-3.5 w-3.5" aria-hidden="true" />
            {filteredLeads.length} visible
          </span>
        </div>
      }
    />
  );

  if (hasError) {
    return (
      <PageLayout header={header}>
        <EmptyState
          title="Leads could not be loaded"
          description="The leads service did not return a usable result. Retry logic and service-state helpers can be layered on later without changing this page structure."
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout header={header}>
      <PageSection
        title="Lead pipeline"
        description="Search, filter, and open lead details without leaving the queue."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {activeFilterCount > 0 ? (
              <span className={leadsSoftChipClassName}>
                <AppIcon name="search" className="h-3.5 w-3.5" aria-hidden="true" />
                {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
              </span>
            ) : null}
            {selectedLeadId ? (
              <span className={leadsChipClassName}>
                <AppIcon name="profile" className="h-3.5 w-3.5" aria-hidden="true" />
                Detail open
              </span>
            ) : null}
          </div>
        }
      >
        <FilterBar
          actions={
            <div className="flex w-full flex-wrap items-center gap-3 max-[640px]:items-start min-[900px]:w-auto">
              <strong className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-border-accent bg-primary/12 px-3 text-[1rem] font-semibold leading-none tracking-[-0.03em] text-text-accent shadow-sm">
                {filteredLeads.length}
              </strong>
              <div className="grid gap-px">
                <span className="text-[13px] font-semibold text-text-secondary">
                  matching leads
                </span>
                <span className="text-[11px] text-text-muted">
                  Select any row to inspect details.
                </span>
              </div>
            </div>
          }
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search name, phone, handle, or status"
            disabled={isLoading}
          />

          <label className="grid min-w-[min(200px,100%)] flex-[1_1_100%] gap-2 min-[640px]:flex-[0_1_200px]">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
              Status
            </span>
            <FilterSelect
              value={statusFilter}
              options={STATUS_FILTER_OPTIONS}
              onChange={(value) => setStatusFilter(value as LeadStatusFilter)}
              disabled={isLoading}
            />
          </label>

          <label className="grid min-w-[min(200px,100%)] flex-[1_1_100%] gap-2 min-[640px]:flex-[0_1_200px]">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
              Channel
            </span>
            <FilterSelect
              value={sourceFilter}
              options={SOURCE_FILTER_OPTIONS}
              onChange={(value) => setSourceFilter(value as LeadSourceFilter)}
              disabled={isLoading}
            />
          </label>
        </FilterBar>

        <div className="leads-table-block [&_.table-shell]:border-border-accent/70 [&_.table-shell]:shadow-sm [&_.data-table__cell:first-child]:pl-5 max-[640px]:[&_.data-table__cell:first-child]:pl-4 [&_.data-table__cell--head:first-child]:pl-5 max-[640px]:[&_.data-table__cell--head:first-child]:pl-4 [&_.data-table__row--clickable:hover_.status-badge]:-translate-y-px [&_.data-table__row--clickable:hover_.table-cell-primary]:text-text-accent">
          <DataTable
            data={paginatedLeads}
            columns={columns}
            rowKey="id"
            loading={isLoading}
            onRowClick={(lead) => setSelectedLeadId(lead.id)}
            emptyTitle="No leads match the current view"
            emptyDescription="Adjust the search or filters to find a different segment of the mock lead pipeline."
          />
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
          onClose={() => setSelectedLeadId(null)}
        />
      ) : null}
    </PageLayout>
  );
}

export default LeadsPage;
