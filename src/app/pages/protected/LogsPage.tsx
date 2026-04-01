import { useEffect, useMemo, useState } from 'react';
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
import LogDetailPanel from '../../../features/logs/components/LogDetailPanel';
import { getLogTypeLabel, getLogTypeTone } from '../../../features/logs/utils/log-format';
import { formatLocalizedDate } from '../../../i18n/date-format';
import { usePersistentState } from '../../../lib/persistent-state';
import { services } from '../../../services';
import type {
  AppLog,
  LogListParams,
  LogType,
  PaginationMeta,
  SelectOption,
  SystemHealth,
} from '../../../types/domain';

type LogTypeFilter = 'all' | LogType;
type LogOrdering = '-created_at' | 'created_at';

const PAGE_SIZE = 10;
const DEFAULT_ORDERING: LogOrdering = '-created_at';
const DEFAULT_CLEANUP_RETENTION_HOURS = 24 * 7;
const CLEANUP_RETENTION_PRESET_HOURS = [6, 12, 24, 48, 72, 24 * 7, 24 * 14, 24 * 30];

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
const healthCardClassName =
  'grid gap-2 rounded-lg bg-surface-subtle/80 p-3';

function parseOrdering(ordering: LogOrdering): Pick<LogListParams, 'sortBy' | 'sortDirection'> {
  return {
    sortBy: ordering.replace('-', ''),
    sortDirection: ordering.startsWith('-') ? 'desc' : 'asc',
  };
}

function getHealthTone(status: string): 'success' | 'warning' | 'danger' {
  if (status === 'ok') {
    return 'success';
  }

  if (status === 'error') {
    return 'danger';
  }

  return 'warning';
}

function getHealthLabel(status: string): string {
  if (status === 'ok') {
    return 'OK';
  }

  if (status === 'error') {
    return 'DOWN';
  }

  return 'DEGRADED';
}

function shortenMessage(message: string): string {
  const normalized = message.trim();
  if (normalized.length <= 140) {
    return normalized;
  }

  return `${normalized.slice(0, 137)}...`;
}

function extractPathSegment(pathValue: string): string {
  const normalizedPath = pathValue.trim();
  if (!normalizedPath) {
    return '-';
  }

  const withoutQuery = normalizedPath.split('?')[0]?.split('#')[0] ?? normalizedPath;
  const lowerCasedPath = withoutQuery.toLowerCase();
  const apiMarker = '/api/';
  const markerIndex = lowerCasedPath.indexOf(apiMarker);

  if (markerIndex >= 0) {
    const afterApi = withoutQuery
      .slice(markerIndex + apiMarker.length)
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');
    return afterApi || '-';
  }

  const segments = withoutQuery
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  if (!segments.length) {
    return '-';
  }

  return segments.join('/');
}

function getLogPathLabel(log: AppLog): string {
  const metadataRecord = toMetadataRecord(log.metadata);
  const pathValue =
    typeof metadataRecord?.path === 'string'
      ? metadataRecord.path
      : typeof metadataRecord?.url === 'string'
        ? metadataRecord.url
        : '';

  return pathValue ? extractPathSegment(pathValue) : '-';
}

function getLogStatusCode(log: AppLog): number | null {
  const metadataRecord = toMetadataRecord(log.metadata);
  const candidate = readNumericValue(
    metadataRecord?.status_code ?? metadataRecord?.statusCode,
  );
  if (!candidate) {
    return null;
  }

  return Math.floor(candidate);
}

function readNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toMetadataRecord(metadata: AppLog['metadata']): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    if (typeof metadata !== 'string') {
      return null;
    }

    const trimmed = metadata.trim();
    if (!trimmed) {
      return null;
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }

    return null;
  }

  return metadata as Record<string, unknown>;
}

function resolveCleanupRetentionHours(setting: AppLog | null): number | null {
  if (!setting) {
    return null;
  }

  const metadataRecord = toMetadataRecord(setting.metadata);
  const hourCandidates = [
    metadataRecord?.retention_hours,
    metadataRecord?.retentionHours,
    metadataRecord?.cleanup_after_hours,
    metadataRecord?.cleanupAfterHours,
    metadataRecord?.delete_after_hours,
    metadataRecord?.deleteAfterHours,
    metadataRecord?.hours,
    metadataRecord?.ttl_hours,
  ];

  for (const candidate of hourCandidates) {
    const numericValue = readNumericValue(candidate);
    if (numericValue && numericValue > 0) {
      return Math.floor(numericValue);
    }
  }

  const dayCandidates = [
    metadataRecord?.retention_days,
    metadataRecord?.retentionDays,
    metadataRecord?.cleanup_after_days,
    metadataRecord?.cleanupAfterDays,
    metadataRecord?.delete_after_days,
    metadataRecord?.deleteAfterDays,
    metadataRecord?.days,
  ];

  for (const candidate of dayCandidates) {
    const numericValue = readNumericValue(candidate);
    if (numericValue && numericValue > 0) {
      return Math.floor(numericValue * 24);
    }
  }

  const normalizedMessage = setting.message.toLowerCase();
  const hourMatch = normalizedMessage.match(
    /(\d+(?:[.,]\d+)?)\s*(?:hour|hours|hr|hrs|soat|час|часа|часов)\b/i,
  );
  if (hourMatch) {
    const parsedHours = Number(hourMatch[1].replace(',', '.'));
    if (Number.isFinite(parsedHours) && parsedHours > 0) {
      return Math.floor(parsedHours);
    }
  }

  const dayMatch = normalizedMessage.match(
    /(\d+(?:[.,]\d+)?)\s*(?:day|days|kun|день|дня|дней)\b/i,
  );
  if (dayMatch) {
    const parsedDays = Number(dayMatch[1].replace(',', '.'));
    if (Number.isFinite(parsedDays) && parsedDays > 0) {
      return Math.floor(parsedDays * 24);
    }
  }

  return null;
}

function resolveRussianPlural(value: number, one: string, few: string, many: string): string {
  const mod10 = value % 10;
  const mod100 = value % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return few;
  }

  return many;
}

function formatRetentionLabel(hours: number, language: string): string {
  const normalizedHours = Math.max(1, Math.floor(hours));
  const isRu = language === 'ru';

  if (normalizedHours % 24 === 0) {
    const days = normalizedHours / 24;
    if (isRu) {
      return `${days} ${resolveRussianPlural(days, 'день', 'дня', 'дней')}`;
    }

    return `${days} kun`;
  }

  if (isRu) {
    return `${normalizedHours} ${resolveRussianPlural(normalizedHours, 'час', 'часа', 'часов')}`;
  }

  return `${normalizedHours} soat`;
}

function LogsPage() {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';
  const isRu = i18n.language === 'ru';
  const [search, setSearch] = usePersistentState('logs:search', '');
  const [typeFilter, setTypeFilter] = useState<LogTypeFilter>('all');
  const [ordering, setOrdering] = useState<LogOrdering>(DEFAULT_ORDERING);
  const [currentPage, setCurrentPage] = useState(1);
  const [logs, setLogs] = useState<AppLog[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>(
    DEFAULT_PAGINATION_META,
  );
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [cleanupSettings, setCleanupSettings] = useState<AppLog | null>(null);
  const [cleanupRetentionHours, setCleanupRetentionHours] = useState(
    String(DEFAULT_CLEANUP_RETENTION_HOURS),
  );
  const [appliedCleanupRetentionHours, setAppliedCleanupRetentionHours] = useState(
    DEFAULT_CLEANUP_RETENTION_HOURS,
  );
  const [isCleanupLoading, setIsCleanupLoading] = useState(true);
  const [isCleanupSaving, setIsCleanupSaving] = useState(false);
  const [cleanupError, setCleanupError] = useState<string | null>(null);
  const [cleanupSuccess, setCleanupSuccess] = useState<string | null>(null);
  const [reloadCursor] = useState(0);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, ordering]);

  useEffect(() => {
    let isActive = true;

    async function loadHealth() {
      setIsHealthLoading(true);

      try {
        const result = await services.logs.getHealth();
        if (!isActive) {
          return;
        }

        setHealth(result);
      } catch {
        if (!isActive) {
          return;
        }

        setHealth(null);
      } finally {
        if (isActive) {
          setIsHealthLoading(false);
        }
      }
    }

    void loadHealth();

    return () => {
      isActive = false;
    };
  }, [reloadCursor]);

  useEffect(() => {
    let isActive = true;

    async function loadCleanupSettings() {
      setIsCleanupLoading(true);
      setCleanupError(null);

      try {
        const result = await services.logs.getCleanupSettings();
        if (!isActive) {
          return;
        }

        setCleanupSettings(result);
        const resolvedHours =
          resolveCleanupRetentionHours(result) ?? DEFAULT_CLEANUP_RETENTION_HOURS;
        setAppliedCleanupRetentionHours(resolvedHours);
        setCleanupRetentionHours(String(resolvedHours));
      } catch {
        if (!isActive) {
          return;
        }

        setCleanupSettings(null);
        setAppliedCleanupRetentionHours(DEFAULT_CLEANUP_RETENTION_HOURS);
        setCleanupRetentionHours(String(DEFAULT_CLEANUP_RETENTION_HOURS));
        setCleanupError(
          isRu
            ? 'Не удалось загрузить настройки автоочистки.'
            : "Avto tozalash sozlamalarini yuklab bo'lmadi.",
        );
      } finally {
        if (isActive) {
          setIsCleanupLoading(false);
        }
      }
    }

    void loadCleanupSettings();

    return () => {
      isActive = false;
    };
  }, [isRu, reloadCursor]);

  useEffect(() => {
    if (!cleanupSuccess) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCleanupSuccess(null);
    }, 2800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [cleanupSuccess]);

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
      { value: '-created_at', label: "Qo'shilgan (yangi)" },
      { value: 'created_at', label: "Qo'shilgan (eski)" },
    ],
    [],
  );

  const cleanupRetentionOptions = useMemo<SelectOption[]>(() => {
    const values = Array.from(
      new Set([
        ...CLEANUP_RETENTION_PRESET_HOURS,
        appliedCleanupRetentionHours,
      ]),
    ).sort((left, right) => left - right);

    return values.map((hours) => ({
      value: String(hours),
      label: formatRetentionLabel(hours, i18n.language),
    }));
  }, [appliedCleanupRetentionHours, i18n.language]);

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
        key: 'path',
        label: 'Path',
        render: (log) => (
          <span className={tablePrimaryTextClassName}>{getLogPathLabel(log)}</span>
        ),
      },
      {
        key: 'statusCode',
        label: 'Status code',
        render: (log) => (
          <span className={tablePrimaryTextClassName}>
            {getLogStatusCode(log) ?? '-'}
          </span>
        ),
      },
      {
        key: 'message',
        label: 'Xabar',
        render: (log) => (
          <span className={tablePrimaryTextClassName}>{shortenMessage(log.message)}</span>
        ),
      },
      {
        key: 'createdAt',
        label: "Qo'shilgan",
        render: (log) => (
          <span className={tablePrimaryTextClassName}>
            {formatLocalizedDate(log.created_at, i18n.language, {
              locale,
              withYear: true,
              shortMonth: true,
              withTime: true,
              fallback: '-',
            })}
          </span>
        ),
      },
    ];
  }, [i18n.language, locale]);

  const activeFilterCount =
    Number(search.trim().length > 0) +
    Number(typeFilter !== 'all') +
    Number(ordering !== DEFAULT_ORDERING);

  const parsedCleanupRetentionHours = Number(cleanupRetentionHours);
  const isCleanupRetentionValid =
    Number.isFinite(parsedCleanupRetentionHours) &&
    parsedCleanupRetentionHours > 0;
  const normalizedCleanupRetentionHours = isCleanupRetentionValid
    ? Math.max(1, Math.floor(parsedCleanupRetentionHours))
    : null;
  const hasCleanupRetentionChanges =
    normalizedCleanupRetentionHours !== null &&
    normalizedCleanupRetentionHours !== appliedCleanupRetentionHours;
  const cleanupUpdatedAtLabel = cleanupSettings?.created_at
    ? formatLocalizedDate(cleanupSettings.created_at, i18n.language, {
        locale,
        withYear: true,
        withTime: true,
        shortMonth: true,
        fallback: '-',
      })
    : '-';

  async function handleSaveCleanupSettings() {
    if (!isCleanupRetentionValid || normalizedCleanupRetentionHours === null) {
      setCleanupSuccess(null);
      setCleanupError(
        isRu
          ? 'Введите корректное время хранения логов.'
          : "Log saqlash vaqtini to'g'ri kiriting.",
      );
      return;
    }

    setIsCleanupSaving(true);
    setCleanupError(null);
    setCleanupSuccess(null);

    try {
      const updatedSettings = await services.logs.patchCleanupSettings({
        retentionHours: normalizedCleanupRetentionHours,
      });
      setCleanupSettings(updatedSettings);

      const resolvedHours =
        resolveCleanupRetentionHours(updatedSettings) ??
        normalizedCleanupRetentionHours;
      setAppliedCleanupRetentionHours(resolvedHours);
      setCleanupRetentionHours(String(resolvedHours));
      setCleanupSuccess(
        isRu
          ? 'Настройки автоочистки сохранены.'
          : 'Avto tozalash sozlamalari saqlandi.',
      );
    } catch {
      setCleanupError(
        isRu
          ? 'Не удалось сохранить настройки автоочистки.'
          : "Avto tozalash sozlamalarini saqlab bo'lmadi.",
      );
    } finally {
      setIsCleanupSaving(false);
    }
  }

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
            <div className="flex w-full flex-wrap items-end gap-2 max-[820px]:justify-start min-[820px]:w-auto min-[820px]:justify-end">
              {activeFilterCount > 0 ? (
                <span className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary/12 px-3 text-sm font-semibold text-text-accent">
                  <AppIcon name="filter" className="h-4 w-4" aria-hidden="true" />
                  {activeFilterCount} ta filter faol
                </span>
              ) : null}

              <div className="grid min-w-[min(320px,100%)] flex-[1_1_320px] gap-1.5 rounded-lg bg-background-subtle/72 p-2.5 ring-1 ring-border-soft/35 min-[960px]:w-[360px] min-[960px]:flex-none">
                <div className="flex items-center justify-between gap-2">
                  <span className={labelClassName}>
                    {isRu ? 'Автоочистка логов' : "Loglarni avtomatik tozalash"}
                  </span>
                  <span className="text-[11px] font-medium text-text-secondary">
                    {isCleanupLoading
                      ? isRu
                        ? 'Загрузка...'
                        : 'Yuklanmoqda...'
                      : `${isRu ? 'Текущий' : 'Joriy'}: ${formatRetentionLabel(appliedCleanupRetentionHours, i18n.language)}`}
                  </span>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
                  <FilterSelect
                    value={cleanupRetentionHours}
                    options={cleanupRetentionOptions}
                    onChange={(value) => {
                      setCleanupRetentionHours(value);
                      setCleanupError(null);
                      setCleanupSuccess(null);
                    }}
                    disabled={isCleanupLoading || isCleanupSaving}
                  />
                  <button
                    type="button"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => {
                      void handleSaveCleanupSettings();
                    }}
                    disabled={
                      isCleanupLoading ||
                      isCleanupSaving ||
                      !isCleanupRetentionValid ||
                      !hasCleanupRetentionChanges
                    }
                  >
                    {isCleanupSaving
                      ? isRu
                        ? 'Сохранение...'
                        : 'Saqlanmoqda...'
                      : isRu
                        ? 'Сохранить'
                        : 'Saqlash'}
                  </button>
                </div>

                <p className="m-0 text-[11px] text-text-secondary">
                  {isRu
                    ? 'Выберите, через сколько времени логи будут удаляться автоматически.'
                    : "Loglar qancha vaqtdan keyin avtomatik o'chirilishini tanlang."}
                </p>
                <p className="m-0 text-[11px] text-text-muted">
                  {isRu ? 'Обновлено:' : 'Yangilangan:'} {cleanupUpdatedAtLabel}
                </p>
                {cleanupError ? (
                  <p className="m-0 text-[11px] font-medium text-danger">{cleanupError}</p>
                ) : null}
                {!cleanupError && cleanupSuccess ? (
                  <p className="m-0 text-[11px] font-medium text-success">{cleanupSuccess}</p>
                ) : null}
              </div>
            </div>
          }
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Xabar bo'yicha qidirish"
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
          <div className="grid gap-3 px-1 pb-3 min-[820px]:grid-cols-3">
            <div className={healthCardClassName}>
              <span className={labelClassName}>API status</span>
              {isHealthLoading ? (
                <span className={tableSecondaryTextClassName}>Yuklanmoqda...</span>
              ) : (
                <StatusBadge
                  status={health?.status ?? 'warning'}
                  tone={getHealthTone(health?.status ?? 'warning')}
                  label={getHealthLabel(health?.status ?? 'warning')}
                />
              )}
            </div>
            <div className={healthCardClassName}>
              <span className={labelClassName}>Database</span>
              {isHealthLoading ? (
                <span className={tableSecondaryTextClassName}>Yuklanmoqda...</span>
              ) : (
                <StatusBadge
                  status={health?.database ?? 'warning'}
                  tone={getHealthTone(health?.database ?? 'warning')}
                  label={getHealthLabel(health?.database ?? 'warning')}
                />
              )}
            </div>
            <div className={healthCardClassName}>
              <span className={labelClassName}>Redis</span>
              {isHealthLoading ? (
                <span className={tableSecondaryTextClassName}>Yuklanmoqda...</span>
              ) : (
                <StatusBadge
                  status={health?.redis ?? 'warning'}
                  tone={getHealthTone(health?.redis ?? 'warning')}
                  label={getHealthLabel(health?.redis ?? 'warning')}
                />
              )}
            </div>
          </div>
        </PageCard>

        <PageCard>
          <DataTable
            data={logs}
            columns={columns}
            rowKey="id"
            selectedRowKey={selectedLogId}
            loading={isLoading}
            onRowClick={(log) => setSelectedLogId(log.id)}
            emptyTitle="Loglar topilmadi"
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
