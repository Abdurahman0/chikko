import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { FaInstagram, FaTelegramPlane } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import {
  DataTable,
  FilterBar,
  FilterSelect,
  Pagination,
  SearchInput,
  StatusBadge,
  Switch,
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
import { useAuth } from '../../../auth';
import IntegrationConfigDeleteDialog from '../../../features/integrations/components/IntegrationConfigDeleteDialog';
import IntegrationConfigDetailPanel from '../../../features/integrations/components/IntegrationConfigDetailPanel';
import IntegrationConfigFormPanel from '../../../features/integrations/components/IntegrationConfigFormPanel';
import IntegrationEventDetailPanel from '../../../features/integrations/components/IntegrationEventDetailPanel';
import { formatLocalizedDate } from '../../../i18n/date-format';
import {
  getIntegrationPlatformClassName,
  getIntegrationPlatformLabel,
  getIntegrationProviderClassName,
  getIntegrationProviderLabel,
  maskSecretValue,
} from '../../../features/integrations/utils/integration-format';
import { usePersistentState } from '../../../lib/persistent-state';
import { services } from '../../../services';
import type {
  EntityId,
  IntegrationConfig,
  IntegrationConfigListParams,
  IntegrationConfigMutationInput,
  IntegrationEvent,
  IntegrationEventListParams,
  IntegrationPlatform,
  IntegrationProvider,
  PaginationMeta,
  SelectOption,
} from '../../../types/domain';

type IntegrationView = 'configs' | 'events';
type ProviderFilter = 'all' | IntegrationProvider;
type PlatformFilter = 'all' | IntegrationPlatform;
type ActiveFilter = 'all' | 'active' | 'inactive';
type SecretFilter = 'all' | 'secret' | 'public';
type ProcessedFilter = 'all' | 'processed' | 'pending';
type ConfigOrdering =
  | '-updated_at'
  | 'updated_at'
  | '-created_at'
  | 'created_at'
  | 'provider'
  | '-provider'
  | 'key'
  | '-key';
type EventOrdering =
  | '-created_at'
  | 'created_at'
  | '-updated_at'
  | 'updated_at'
  | '-processing_attempts'
  | 'processing_attempts';

const PAGE_SIZE = 8;
const CONFIG_DEFAULT_ORDERING: ConfigOrdering = '-updated_at';
const EVENT_DEFAULT_ORDERING: EventOrdering = '-created_at';

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
  'inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface-card text-text-secondary shadow-sm ring-1 ring-border-soft/40 transition duration-fast hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function shouldEnforceSingleActive(provider: IntegrationProvider): boolean {
  return provider !== 'openai';
}

function resolveHumanLabel(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || UUID_PATTERN.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function ProviderIcon({ provider }: { provider: IntegrationProvider }) {
  if (provider === 'telegram') {
    return <FaTelegramPlane className="h-3.5 w-3.5" aria-hidden="true" />;
  }

  if (provider === 'instagram') {
    return <FaInstagram className="h-3.5 w-3.5" aria-hidden="true" />;
  }

  return <AppIcon name="sparkles" className="h-3.5 w-3.5" aria-hidden="true" />;
}

function PlatformIcon({ platform }: { platform: IntegrationPlatform }) {
  if (platform === 'telegram') {
    return <FaTelegramPlane className="h-3.5 w-3.5" aria-hidden="true" />;
  }

  if (platform === 'instagram') {
    return <FaInstagram className="h-3.5 w-3.5" aria-hidden="true" />;
  }

  if (platform === 'userbot') {
    return <AppIcon name="activity" className="h-3.5 w-3.5" aria-hidden="true" />;
  }

  return <AppIcon name="payments" className="h-3.5 w-3.5" aria-hidden="true" />;
}

function parseConfigOrdering(ordering: ConfigOrdering): Pick<
  IntegrationConfigListParams,
  'sortBy' | 'sortDirection'
> {
  return {
    sortBy: ordering.replace('-', ''),
    sortDirection: ordering.startsWith('-') ? 'desc' : 'asc',
  };
}

function parseEventOrdering(ordering: EventOrdering): Pick<
  IntegrationEventListParams,
  'sortBy' | 'sortDirection'
> {
  return {
    sortBy: ordering.replace('-', ''),
    sortDirection: ordering.startsWith('-') ? 'desc' : 'asc',
  };
}

function toBooleanActiveFilter(value: ActiveFilter): boolean | undefined {
  if (value === 'active') return true;
  if (value === 'inactive') return false;
  return undefined;
}

function toBooleanSecretFilter(value: SecretFilter): boolean | undefined {
  if (value === 'secret') return true;
  if (value === 'public') return false;
  return undefined;
}

function toBooleanProcessedFilter(value: ProcessedFilter): boolean | undefined {
  if (value === 'processed') return true;
  if (value === 'pending') return false;
  return undefined;
}

function IntegrationsPage() {
  const { t, i18n } = useTranslation();
  const { hasPermission, hasRole } = useAuth();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';
  const canManageIntegrations =
    hasRole('developer') || hasPermission('can_manage_integrations');

  const [view, setView] = usePersistentState<IntegrationView>('integrations:view', 'configs', {
    deserialize: (value) => {
      const parsed = JSON.parse(value);
      return parsed === 'events' ? 'events' : 'configs';
    },
  });

  const [configSearch, setConfigSearch] = usePersistentState(
    'integrations:config-search',
    '',
  );
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>('all');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [secretFilter, setSecretFilter] = useState<SecretFilter>('all');
  const [configOrdering, setConfigOrdering] = useState<ConfigOrdering>(CONFIG_DEFAULT_ORDERING);
  const [configPage, setConfigPage] = useState(1);
  const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
  const [configPaginationMeta, setConfigPaginationMeta] = useState<PaginationMeta>(DEFAULT_PAGINATION_META);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [hasConfigError, setHasConfigError] = useState(false);
  const [hasLoadedConfigs, setHasLoadedConfigs] = useState(false);
  const [configReloadCursor, setConfigReloadCursor] = useState(0);
  const [configDetailRefreshToken, setConfigDetailRefreshToken] = useState(0);
  const [selectedConfigId, setSelectedConfigId] = useState<EntityId | null>(null);

  const [isConfigFormOpen, setIsConfigFormOpen] = useState(false);
  const [configFormMode, setConfigFormMode] = useState<'create' | 'edit'>('create');
  const [editingConfig, setEditingConfig] = useState<IntegrationConfig | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configFormError, setConfigFormError] = useState<string | null>(null);
  const [configToDelete, setConfigToDelete] = useState<IntegrationConfig | null>(null);
  const [isDeletingConfig, setIsDeletingConfig] = useState(false);
  const [togglingConfigId, setTogglingConfigId] = useState<EntityId | null>(null);

  const [eventSearch, setEventSearch] = usePersistentState(
    'integrations:event-search',
    '',
  );
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [processedFilter, setProcessedFilter] = useState<ProcessedFilter>('all');
  const [eventOrdering, setEventOrdering] = useState<EventOrdering>(EVENT_DEFAULT_ORDERING);
  const [eventPage, setEventPage] = useState(1);
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const [eventPaginationMeta, setEventPaginationMeta] = useState<PaginationMeta>(DEFAULT_PAGINATION_META);
  const [isEventLoading, setIsEventLoading] = useState(true);
  const [hasEventError, setHasEventError] = useState(false);
  const [hasLoadedEvents, setHasLoadedEvents] = useState(false);
  const [eventReloadCursor, setEventReloadCursor] = useState(0);
  const [selectedEventId, setSelectedEventId] = useState<EntityId | null>(null);

  useEffect(() => {
    setConfigPage(1);
  }, [configSearch, providerFilter, activeFilter, secretFilter, configOrdering]);

  useEffect(() => {
    setEventPage(1);
  }, [eventSearch, platformFilter, processedFilter, eventOrdering]);

  useEffect(() => {
    let isActive = true;

    async function loadConfigs() {
      setIsConfigLoading(true);
      setHasConfigError(false);

      try {
        const result = await services.integrations.listIntegrationConfigs({
          page: configPage,
          pageSize: PAGE_SIZE,
          search: configSearch.trim() || undefined,
          provider: providerFilter === 'all' ? undefined : providerFilter,
          is_active: toBooleanActiveFilter(activeFilter),
          is_secret: toBooleanSecretFilter(secretFilter),
          ordering: configOrdering,
          ...parseConfigOrdering(configOrdering),
        });

        if (!isActive) return;
        if (configPage > result.meta.totalPages) {
          setConfigPage(result.meta.totalPages);
          return;
        }

        setConfigs(result.items);
        setConfigPaginationMeta(result.meta);
      } catch {
        if (!isActive) return;
        setHasConfigError(true);
        setConfigs([]);
        setConfigPaginationMeta(DEFAULT_PAGINATION_META);
      } finally {
        if (isActive) {
          setHasLoadedConfigs(true);
          setIsConfigLoading(false);
        }
      }
    }

    void loadConfigs();
    return () => {
      isActive = false;
    };
  }, [
    activeFilter,
    configOrdering,
    configPage,
    configReloadCursor,
    configSearch,
    providerFilter,
    secretFilter,
  ]);

  useEffect(() => {
    let isActive = true;

    async function loadEvents() {
      setIsEventLoading(true);
      setHasEventError(false);

      try {
        const result = await services.integrations.listIntegrationEvents({
          page: eventPage,
          pageSize: PAGE_SIZE,
          search: eventSearch.trim() || undefined,
          platform: platformFilter === 'all' ? undefined : platformFilter,
          processed: toBooleanProcessedFilter(processedFilter),
          ordering: eventOrdering,
          ...parseEventOrdering(eventOrdering),
        });

        if (!isActive) return;
        if (eventPage > result.meta.totalPages) {
          setEventPage(result.meta.totalPages);
          return;
        }

        setEvents(result.items);
        setEventPaginationMeta(result.meta);
      } catch {
        if (!isActive) return;
        setHasEventError(true);
        setEvents([]);
        setEventPaginationMeta(DEFAULT_PAGINATION_META);
      } finally {
        if (isActive) {
          setHasLoadedEvents(true);
          setIsEventLoading(false);
        }
      }
    }

    void loadEvents();
    return () => {
      isActive = false;
    };
  }, [
    eventOrdering,
    eventPage,
    eventReloadCursor,
    eventSearch,
    platformFilter,
    processedFilter,
  ]);

  const providerOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'all', label: t('integrations.filters.allProviders') },
      { value: 'telegram', label: t('integrations.providers.telegram') },
      { value: 'instagram', label: t('integrations.providers.instagram') },
      { value: 'openai', label: t('integrations.providers.openai') },
    ],
    [t],
  );
  const activeOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'all', label: t('integrations.filters.allStatuses') },
      { value: 'active', label: t('common.active') },
      { value: 'inactive', label: t('common.inactive') },
    ],
    [t],
  );
  const secretOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'all', label: t('integrations.filters.allTypes') },
      { value: 'secret', label: t('integrations.secret') },
      { value: 'public', label: t('integrations.public') },
    ],
    [t],
  );
  const configOrderingOptions = useMemo<SelectOption[]>(
    () => [
      { value: '-updated_at', label: t('integrations.ordering.updatedNewest') },
      { value: 'updated_at', label: t('integrations.ordering.updatedOldest') },
      { value: '-created_at', label: t('integrations.ordering.createdNewest') },
      { value: 'created_at', label: t('integrations.ordering.createdOldest') },
      { value: 'provider', label: t('integrations.ordering.providerAsc') },
      { value: '-provider', label: t('integrations.ordering.providerDesc') },
      { value: 'key', label: t('integrations.ordering.keyAsc') },
      { value: '-key', label: t('integrations.ordering.keyDesc') },
    ],
    [t],
  );

  const platformOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'all', label: t('integrations.filters.allPlatforms') },
      { value: 'telegram', label: t('integrations.platforms.telegram') },
      { value: 'instagram', label: t('integrations.platforms.instagram') },
      { value: 'userbot', label: t('integrations.platforms.userbot') },
      { value: 'payment', label: t('integrations.platforms.payment') },
    ],
    [t],
  );
  const processedOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'all', label: t('integrations.filters.allProcessed') },
      { value: 'processed', label: t('integrations.processed') },
      { value: 'pending', label: t('integrations.pending') },
    ],
    [t],
  );
  const eventOrderingOptions = useMemo<SelectOption[]>(
    () => [
      { value: '-created_at', label: t('integrations.ordering.createdNewest') },
      { value: 'created_at', label: t('integrations.ordering.createdOldest') },
      { value: '-updated_at', label: t('integrations.ordering.updatedNewest') },
      { value: 'updated_at', label: t('integrations.ordering.updatedOldest') },
      { value: '-processing_attempts', label: t('integrations.ordering.attemptsHighLow') },
      { value: 'processing_attempts', label: t('integrations.ordering.attemptsLowHigh') },
    ],
    [t],
  );

  function openCreateConfigForm() {
    if (!canManageIntegrations) return;
    setConfigFormMode('create');
    setEditingConfig(null);
    setConfigFormError(null);
    setIsConfigFormOpen(true);
  }
  function openEditConfigForm(config: IntegrationConfig) {
    if (!canManageIntegrations) return;
    setConfigFormMode('edit');
    setEditingConfig(config);
    setConfigFormError(null);
    setIsConfigFormOpen(true);
  }
  function requestConfigDelete(config: IntegrationConfig) {
    if (!canManageIntegrations) return;
    setConfigToDelete(config);
  }

  async function handleSaveConfig(payload: IntegrationConfigMutationInput) {
    setIsSavingConfig(true);
    setConfigFormError(null);
    try {
      if (configFormMode === 'create') {
        await services.integrations.createIntegrationConfig(payload);
        setConfigPage(1);
      } else {
        const editingId = editingConfig?.id;
        if (!editingId) throw new Error(t('integrations.configForm.saveError'));
        const updated = await services.integrations.updateIntegrationConfig(editingId, payload);
        if (!updated) throw new Error(t('integrations.configForm.saveError'));
        setConfigDetailRefreshToken((current) => current + 1);
      }
      setIsConfigFormOpen(false);
      setEditingConfig(null);
      setConfigReloadCursor((current) => current + 1);
    } catch (error) {
      setConfigFormError(
        error instanceof Error ? error.message : t('integrations.configForm.saveError'),
      );
    } finally {
      setIsSavingConfig(false);
    }
  }

  async function handleConfirmDeleteConfig() {
    if (!configToDelete) return;
    setIsDeletingConfig(true);
    try {
      const deleted = await services.integrations.deleteIntegrationConfig(configToDelete.id);
      if (!deleted) throw new Error();
      if (selectedConfigId === configToDelete.id) setSelectedConfigId(null);
      setConfigToDelete(null);
      setConfigReloadCursor((current) => current + 1);
    } catch {
      // keep dialog open on failure
    } finally {
      setIsDeletingConfig(false);
    }
  }

  const handleToggleConfigActive = useCallback(async (config: IntegrationConfig) => {
    if (!canManageIntegrations || togglingConfigId) {
      return;
    }

    setTogglingConfigId(config.id);
    const nextIsActive = !config.is_active;

    try {
      const updated = await services.integrations.patchIntegrationConfig(config.id, {
        is_active: nextIsActive,
      });
      if (!updated) {
        return;
      }

      setConfigs((current) =>
        current.map((entry) => {
          if (entry.id === updated.id) {
            return updated;
          }

          if (
            nextIsActive &&
            shouldEnforceSingleActive(updated.provider) &&
            entry.provider === updated.provider &&
            entry.is_active
          ) {
            return {
              ...entry,
              is_active: false,
              updated_at: updated.updated_at,
              updated_by: updated.updated_by,
              updated_by_name: updated.updated_by_name,
            };
          }

          return entry;
        }),
      );
      setConfigDetailRefreshToken((current) => current + 1);
      setConfigReloadCursor((current) => current + 1);
    } finally {
      setTogglingConfigId(null);
    }
  }, [canManageIntegrations, togglingConfigId]);

  const configColumns = useMemo<DataTableColumn<IntegrationConfig>[]>(() => {
    const baseColumns: DataTableColumn<IntegrationConfig>[] = [
      {
        key: 'provider',
        label: t('integrations.configColumns.provider'),
        render: (config) => (
          <span
            className={[
              'inline-flex min-h-7 items-center gap-1.5 rounded-pill px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em]',
              getIntegrationProviderClassName(config.provider),
            ].join(' ')}
          >
            <ProviderIcon provider={config.provider} />
            {getIntegrationProviderLabel(config.provider)}
          </span>
        ),
      },
      {
        key: 'key',
        label: t('integrations.configColumns.key'),
        render: (config) => (
          <div className="grid gap-0.5">
            <span className={tablePrimaryTextClassName}>{config.key}</span>
            <span className={tableSecondaryTextClassName}>{config.label}</span>
          </div>
        ),
      },
      {
        key: 'value',
        label: t('integrations.configColumns.value'),
        render: (config) => (
          <span className={tablePrimaryTextClassName}>
            {config.is_secret ? maskSecretValue(config.value) : config.value}
          </span>
        ),
      },
      {
        key: 'visibility',
        label: t('integrations.configColumns.visibility'),
        render: (config) => (
          <StatusBadge
            status={config.is_secret ? 'secret' : 'public'}
            tone={config.is_secret ? 'warning' : 'info'}
            label={config.is_secret ? t('integrations.secret') : t('integrations.public')}
          />
        ),
      },
      {
        key: 'active',
        label: t('integrations.configColumns.active'),
        render: (config) => (
          canManageIntegrations ? (
            <Switch
              checked={config.is_active}
              onChange={() => {
                void handleToggleConfigActive(config);
              }}
              disabled={togglingConfigId === config.id}
              stopPropagation
            />
          ) : (
            <StatusBadge
              status={config.is_active ? 'active' : 'inactive'}
              tone={config.is_active ? 'success' : 'neutral'}
              label={config.is_active ? t('common.active') : t('common.inactive')}
            />
          )
        ),
      },
      {
        key: 'updatedAt',
        label: t('integrations.configColumns.updatedAt'),
        render: (config) => (
          <span className={tablePrimaryTextClassName}>
            {formatLocalizedDate(config.updated_at, i18n.language, {
              locale,
              withYear: true,
              shortMonth: true,
              fallback: t('common.na'),
            })}
          </span>
        ),
      },
    ];

    if (!canManageIntegrations) return baseColumns;

    return [
      ...baseColumns,
      {
        key: 'actions',
        label: t('integrations.configColumns.actions'),
        align: 'right',
        render: (config) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              className={actionButtonClassName}
              onClick={(event) => {
                event.stopPropagation();
                openEditConfigForm(config);
              }}
              aria-label={`${t('integrations.actions.edit')} ${config.label}`}
            >
              <FiEdit2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className={actionButtonClassName}
              onClick={(event) => {
                event.stopPropagation();
                requestConfigDelete(config);
              }}
              aria-label={`${t('integrations.actions.delete')} ${config.label}`}
            >
              <FiTrash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      },
    ];
  }, [
    canManageIntegrations,
    handleToggleConfigActive,
    i18n.language,
    locale,
    t,
    togglingConfigId,
  ]);

  const eventColumns = useMemo<DataTableColumn<IntegrationEvent>[]>(() => {
    return [
      {
        key: 'platform',
        label: t('integrations.eventColumns.platform'),
        render: (event) => (
          <span
            className={[
              'inline-flex min-h-7 items-center gap-1.5 rounded-pill px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em]',
              getIntegrationPlatformClassName(event.platform),
            ].join(' ')}
          >
            <PlatformIcon platform={event.platform} />
            {getIntegrationPlatformLabel(event.platform)}
          </span>
        ),
      },
      {
        key: 'eventType',
        label: t('integrations.eventColumns.eventType'),
        render: (event) => (
          <div className="grid gap-0.5">
            <span className={tablePrimaryTextClassName}>{event.event_type}</span>
            <span className={tableSecondaryTextClassName}>
              {resolveHumanLabel(event.event_key) ?? t('common.na')}
            </span>
          </div>
        ),
      },
      {
        key: 'externalId',
        label: t('integrations.eventColumns.externalId'),
        render: (event) => (
          <span className={tablePrimaryTextClassName}>
            {resolveHumanLabel(event.external_id) ?? t('common.na')}
          </span>
        ),
      },
      {
        key: 'processed',
        label: t('integrations.eventColumns.processed'),
        render: (event) => (
          <StatusBadge
            status={event.processed ? 'processed' : 'pending'}
            tone={event.processed ? 'success' : 'warning'}
            label={event.processed ? t('integrations.processed') : t('integrations.pending')}
          />
        ),
      },
      {
        key: 'attempts',
        label: t('integrations.eventColumns.attempts'),
        render: (event) => <span className={tablePrimaryTextClassName}>{event.processing_attempts}</span>,
      },
      {
        key: 'createdAt',
        label: t('integrations.eventColumns.createdAt'),
        render: (event) => (
          <span className={tablePrimaryTextClassName}>
            {formatLocalizedDate(event.created_at, i18n.language, {
              locale,
              withYear: true,
              shortMonth: true,
              fallback: t('common.na'),
            })}
          </span>
        ),
      },
    ];
  }, [i18n.language, locale, t]);

  const header = (
    <PageHeader
      eyebrow={t('integrations.eyebrow')}
      title={t('integrations.title')}
      subtitle={t('integrations.subtitle')}
      actions={
        <div className="flex w-full flex-wrap items-center gap-2 min-[768px]:w-auto">
          {view === 'configs' && canManageIntegrations ? (
            <button
              type="button"
              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              onClick={openCreateConfigForm}
            >
              <AppIcon name="plus" className="h-4 w-4" aria-hidden="true" />
              {t('integrations.newConfig')}
            </button>
          ) : null}
          <span className="inline-flex min-h-8 items-center gap-2 rounded-pill bg-primary/12 px-3 text-[12px] font-semibold text-text-accent">
            <AppIcon name="integrations" className="h-3.5 w-3.5" aria-hidden="true" />
            {view === 'configs'
              ? `${configPaginationMeta.totalItems} ${t('integrations.configRecords')}`
              : `${eventPaginationMeta.totalItems} ${t('integrations.eventRecords')}`}
          </span>
        </div>
      }
    />
  );

  const viewSwitch = (
    <PageSection>
      <PageCard>
        <div className="flex flex-wrap items-center gap-2 p-1">
          <button
            type="button"
            className={[
              'inline-flex min-h-10 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
              view === 'configs'
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface-subtle text-text-secondary hover:bg-surface-muted hover:text-text-primary',
            ].join(' ')}
            onClick={() => setView('configs')}
          >
            <span
              className={[
                'inline-flex h-5 w-5 items-center justify-center rounded-full transition duration-fast',
                view === 'configs' ? 'dark:bg-white' : '',
              ].join(' ')}
            >
              <FaTelegramPlane className="h-3.5 w-3.5 text-[rgb(46_169_240)]" />
            </span>
            <FaInstagram className="h-3.5 w-3.5 text-[rgb(224_76_141)]" />
            {t('integrations.views.configs')}
          </button>
          <button
            type="button"
            className={[
              'inline-flex min-h-10 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
              view === 'events'
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface-subtle text-text-secondary hover:bg-surface-muted hover:text-text-primary',
            ].join(' ')}
            onClick={() => setView('events')}
          >
            <AppIcon name="activity" className="h-4 w-4" aria-hidden="true" />
            {t('integrations.views.events')}
          </button>
        </div>
      </PageCard>
    </PageSection>
  );

  if (view === 'configs' && !hasLoadedConfigs && isConfigLoading) {
    return (
      <PageLayout header={header}>
        {viewSwitch}
        <PageSection>
          <PageCard>
            <LoadingState
              title={t('integrations.loadingTitle')}
              description={t('integrations.loadingDescription')}
            />
          </PageCard>
        </PageSection>
      </PageLayout>
    );
  }

  if (view === 'events' && !hasLoadedEvents && isEventLoading) {
    return (
      <PageLayout header={header}>
        {viewSwitch}
        <PageSection>
          <PageCard>
            <LoadingState
              title={t('integrations.loadingTitle')}
              description={t('integrations.loadingDescription')}
            />
          </PageCard>
        </PageSection>
      </PageLayout>
    );
  }

  if (view === 'configs' && hasConfigError) {
    return (
      <PageLayout header={header}>
        {viewSwitch}
        <PageSection>
          <PageCard>
            <EmptyState
              title={t('integrations.errorTitle')}
              description={t('integrations.errorDescription')}
            />
          </PageCard>
        </PageSection>
      </PageLayout>
    );
  }

  if (view === 'events' && hasEventError) {
    return (
      <PageLayout header={header}>
        {viewSwitch}
        <PageSection>
          <PageCard>
            <EmptyState
              title={t('integrations.errorTitle')}
              description={t('integrations.errorDescription')}
            />
          </PageCard>
        </PageSection>
      </PageLayout>
    );
  }

  const configSection = (
    <PageSection>
      <FilterBar>
        <SearchInput
          value={configSearch}
          onChange={setConfigSearch}
          placeholder={t('integrations.configSearchPlaceholder')}
        />
        <label className="grid min-w-[min(160px,100%)] flex-[1_1_160px] gap-1.5 min-[640px]:flex-[0_1_170px]">
          <span className={labelClassName}>{t('integrations.filters.provider')}</span>
          <FilterSelect
            value={providerFilter}
            options={providerOptions}
            onChange={(value) => setProviderFilter(value as ProviderFilter)}
            disabled={isConfigLoading}
          />
        </label>
        <label className="grid min-w-[min(150px,100%)] flex-[1_1_150px] gap-1.5 min-[640px]:flex-[0_1_160px]">
          <span className={labelClassName}>{t('integrations.filters.status')}</span>
          <FilterSelect
            value={activeFilter}
            options={activeOptions}
            onChange={(value) => setActiveFilter(value as ActiveFilter)}
            disabled={isConfigLoading}
          />
        </label>
        <label className="grid min-w-[min(150px,100%)] flex-[1_1_150px] gap-1.5 min-[640px]:flex-[0_1_160px]">
          <span className={labelClassName}>{t('integrations.filters.visibility')}</span>
          <FilterSelect
            value={secretFilter}
            options={secretOptions}
            onChange={(value) => setSecretFilter(value as SecretFilter)}
            disabled={isConfigLoading}
          />
        </label>
        <label className="grid min-w-[min(220px,100%)] flex-[1_1_220px] gap-1.5 min-[640px]:flex-[0_1_240px]">
          <span className={labelClassName}>{t('integrations.filters.ordering')}</span>
          <FilterSelect
            value={configOrdering}
            options={configOrderingOptions}
            onChange={(value) => setConfigOrdering(value as ConfigOrdering)}
            disabled={isConfigLoading}
          />
        </label>
      </FilterBar>
      <PageCard>
        <DataTable
          data={configs}
          columns={configColumns}
          rowKey="id"
          selectedRowKey={selectedConfigId}
          loading={isConfigLoading}
          onRowClick={(config) => setSelectedConfigId(config.id)}
          emptyTitle={t('integrations.configEmptyTitle')}
          emptyDescription={t('integrations.configEmptyDescription')}
        />
      </PageCard>
      {!isConfigLoading && configPaginationMeta.totalItems > 0 ? (
        <Pagination
          currentPage={Math.min(configPage, configPaginationMeta.totalPages)}
          totalPages={configPaginationMeta.totalPages}
          totalItems={configPaginationMeta.totalItems}
          onPageChange={setConfigPage}
        />
      ) : null}
    </PageSection>
  );

  const eventSection = (
    <PageSection>
      <FilterBar>
        <SearchInput
          value={eventSearch}
          onChange={setEventSearch}
          placeholder={t('integrations.eventSearchPlaceholder')}
        />
        <label className="grid min-w-[min(170px,100%)] flex-[1_1_170px] gap-1.5 min-[640px]:flex-[0_1_180px]">
          <span className={labelClassName}>{t('integrations.filters.platform')}</span>
          <FilterSelect
            value={platformFilter}
            options={platformOptions}
            onChange={(value) => setPlatformFilter(value as PlatformFilter)}
            disabled={isEventLoading}
          />
        </label>
        <label className="grid min-w-[min(170px,100%)] flex-[1_1_170px] gap-1.5 min-[640px]:flex-[0_1_180px]">
          <span className={labelClassName}>{t('integrations.filters.processed')}</span>
          <FilterSelect
            value={processedFilter}
            options={processedOptions}
            onChange={(value) => setProcessedFilter(value as ProcessedFilter)}
            disabled={isEventLoading}
          />
        </label>
        <label className="grid min-w-[min(220px,100%)] flex-[1_1_220px] gap-1.5 min-[640px]:flex-[0_1_240px]">
          <span className={labelClassName}>{t('integrations.filters.ordering')}</span>
          <FilterSelect
            value={eventOrdering}
            options={eventOrderingOptions}
            onChange={(value) => setEventOrdering(value as EventOrdering)}
            disabled={isEventLoading}
          />
        </label>
      </FilterBar>
      <PageCard>
        <DataTable
          data={events}
          columns={eventColumns}
          rowKey="id"
          selectedRowKey={selectedEventId}
          loading={isEventLoading}
          onRowClick={(event) => setSelectedEventId(event.id)}
          emptyTitle={t('integrations.eventEmptyTitle')}
          emptyDescription={t('integrations.eventEmptyDescription')}
        />
      </PageCard>
      {!isEventLoading && eventPaginationMeta.totalItems > 0 ? (
        <Pagination
          currentPage={Math.min(eventPage, eventPaginationMeta.totalPages)}
          totalPages={eventPaginationMeta.totalPages}
          totalItems={eventPaginationMeta.totalItems}
          onPageChange={setEventPage}
        />
      ) : null}
    </PageSection>
  );

  return (
    <PageLayout header={header}>
      {viewSwitch}
      {view === 'configs' ? configSection : eventSection}

      {selectedConfigId ? (
        <IntegrationConfigDetailPanel
          configId={selectedConfigId}
          refreshToken={configDetailRefreshToken}
          canManage={canManageIntegrations}
          onClose={() => setSelectedConfigId(null)}
          onEdit={(config) => {
            openEditConfigForm(config);
            setSelectedConfigId(null);
          }}
          onDelete={(config) => {
            requestConfigDelete(config);
            setSelectedConfigId(null);
          }}
        />
      ) : null}

      {selectedEventId ? (
        <IntegrationEventDetailPanel
          eventId={selectedEventId}
          onClose={() => setSelectedEventId(null)}
        />
      ) : null}

      {isConfigFormOpen ? (
        <IntegrationConfigFormPanel
          mode={configFormMode}
          config={editingConfig}
          isSubmitting={isSavingConfig}
          errorMessage={configFormError}
          onClose={() => {
            if (!isSavingConfig) {
              setIsConfigFormOpen(false);
              setEditingConfig(null);
              setConfigFormError(null);
            }
          }}
          onSubmit={handleSaveConfig}
        />
      ) : null}

      {configToDelete ? (
        <IntegrationConfigDeleteDialog
          config={configToDelete}
          isDeleting={isDeletingConfig}
          onCancel={() => {
            if (!isDeletingConfig) setConfigToDelete(null);
          }}
          onConfirm={() => {
            void handleConfirmDeleteConfig();
          }}
        />
      ) : null}
    </PageLayout>
  );
}

export default IntegrationsPage;
