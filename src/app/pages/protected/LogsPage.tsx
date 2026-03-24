import { useEffect, useMemo, useState } from 'react';
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
import LogDetailPanel from '../../../features/logs/components/LogDetailPanel';
import { getLogTypeLabel, getLogTypeTone } from '../../../features/logs/utils/log-format';
import { services } from '../../../services';
import type { AppLog, LogListParams, LogType, PaginationMeta, SelectOption } from '../../../types/domain';

type LogTypeFilter = 'all' | LogType;
type LogOrdering = '-created_at' | 'created_at';

const PAGE_SIZE = 10;
const DEFAULT_ORDERING: LogOrdering = '-created_at';

const DEFAULT_PAGINATION_META: PaginationMeta = {
  page: 1,
  pageSize: PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
};

const tablePrimaryTextClassName =
  'block text-sm font-semibold leading-[1.35] text-text-primary [overflow-wrap:anywhere]';

const tableSecondaryTextClassName =
  'block text-[12px] leading-[1.45] text-text-secondary [overflow-wrap:anywhere]';

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

function parseOrdering(ordering: LogOrdering): Pick<LogListParams, 'sortBy' | 'sortDirection'> {
  return {
    sortBy: ordering.replace('-', ''),
    sortDirection: ordering.startsWith('-') ? 'desc' : 'asc',
  };
}

function LogsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<LogTypeFilter>('all');
  const [ordering, setOrdering] = useState<LogOrdering>(DEFAULT_ORDERING);
  const [currentPage, setCurrentPage] = useState(1);
  const [logs, setLogs] = useState<AppLog[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>(
    DEFAULT_PAGINATION_META,
  );
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [reloadCursor] = useState(0);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, ordering]);

  useEffect(() => {
    let isActive = true;

    async function loadLogs() {
      setIsLoading(true);
      setHasError(false);

      try {
        const result = await services.logs.listLogs({
          page: currentPage,
          pageSize: PAGE_SIZE,
          search: search.trim() || undefined,
          type: typeFilter === 'all' ? undefined : typeFilter,
          ordering,
          ...parseOrdering(ordering),
        });

        if (!isActive) {
          return;
        }

        if (currentPage > result.meta.totalPages) {
          setCurrentPage(result.meta.totalPages);
          return;
        }

        setLogs(result.items);
        setPaginationMeta(result.meta);
      } catch {
        if (!isActive) {
          return;
        }

        setHasError(true);
        setLogs([]);
        setPaginationMeta(DEFAULT_PAGINATION_META);
      } finally {
        if (isActive) {
          setHasLoadedOnce(true);
          setIsLoading(false);
        }
      }
    }

    void loadLogs();

    return () => {
      isActive = false;
    };
  }, [currentPage, ordering, reloadCursor, search, typeFilter]);

  const typeOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'all', label: 'Barcha turlar' },
      { value: 'ai', label: 'AI' },
      { value: 'webhook', label: 'Webhook' },
      { value: 'error', label: 'Xatolik' },
      { value: 'payment', label: "To'lov" },
      { value: 'system', label: 'Tizim' },
    ],
    [],
  );

  const orderingOptions = useMemo<SelectOption[]>(
    () => [
      { value: '-created_at', label: 'Yaratilgan (yangi)' },
      { value: 'created_at', label: 'Yaratilgan (eski)' },
    ],
    [],
  );

  const columns = useMemo<DataTableColumn<AppLog>[]>(() => {
    return [
      {
        key: 'type',
        label: 'Turi',
        render: (log) => (
          <StatusBadge
            status={log.type}
            tone={getLogTypeTone(log.type)}
            label={getLogTypeLabel(log.type)}
          />
        ),
      },
      {
        key: 'message',
        label: 'Xabar',
        render: (log) => (
          <div className="grid gap-0.5">
            <span className={tablePrimaryTextClassName}>{log.message}</span>
            <span className={tableSecondaryTextClassName}>{log.id}</span>
          </div>
        ),
      },
      {
        key: 'createdAt',
        label: 'Yaratilgan',
        render: (log) => (
          <span className={tablePrimaryTextClassName}>
            {new Intl.DateTimeFormat('uz-UZ', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(log.created_at))}
          </span>
        ),
      },
    ];
  }, []);

  const activeFilterCount =
    Number(search.trim().length > 0) +
    Number(typeFilter !== 'all') +
    Number(ordering !== DEFAULT_ORDERING);

  const header = (
    <PageHeader
      eyebrow="Jurnallar"
      title="Jurnallar"
      subtitle="Tizim, webhook, AI va to'lov hodisalarini kuzating."
      actions={
        <span className="inline-flex min-h-8 items-center gap-2 rounded-pill bg-primary/12 px-3 text-[12px] font-semibold text-text-accent">
          <AppIcon name="logs" className="h-3.5 w-3.5" aria-hidden="true" />
          {paginationMeta.totalItems} ta
        </span>
      }
    />
  );

  if (!hasLoadedOnce && isLoading) {
    return (
      <PageLayout header={header}>
        <PageSection>
          <PageCard>
            <LoadingState
              title="Yuklanmoqda..."
              description="Log yozuvlari olinmoqda."
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
              title="Jurnallarni yuklab bo'lmadi"
              description="Sahifani yangilab qayta urinib ko'ring."
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
              {activeFilterCount > 0 ? (
                <span className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary/12 px-3 text-sm font-semibold text-text-accent">
                  <AppIcon name="filter" className="h-4 w-4" aria-hidden="true" />
                  {activeFilterCount} ta filter faol
                </span>
              ) : null}
            </div>
          }
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Xabar bo'yicha qidirish"
            disabled={isLoading}
          />

          <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_180px]">
            <span className={labelClassName}>Turi</span>
            <FilterSelect
              value={typeFilter}
              options={typeOptions}
              onChange={(value) => setTypeFilter(value as LogTypeFilter)}
              disabled={isLoading}
            />
          </label>

          <label className="grid min-w-[min(220px,100%)] flex-[1_1_220px] gap-1.5 min-[640px]:flex-[0_1_240px]">
            <span className={labelClassName}>Saralash</span>
            <FilterSelect
              value={ordering}
              options={orderingOptions}
              onChange={(value) => setOrdering(value as LogOrdering)}
              disabled={isLoading}
            />
          </label>
        </FilterBar>

        <PageCard>
          <DataTable
            data={logs}
            columns={columns}
            rowKey="id"
            selectedRowKey={selectedLogId}
            loading={isLoading}
            onRowClick={(log) => setSelectedLogId(log.id)}
            emptyTitle="Jurnal topilmadi"
            emptyDescription="Qidiruv yoki filterlarni o'zgartirib qayta urinib ko'ring."
          />
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

      {selectedLogId ? (
        <LogDetailPanel
          logId={selectedLogId}
          onClose={() => setSelectedLogId(null)}
        />
      ) : null}
    </PageLayout>
  );
}

export default LogsPage;
