import { useCallback, useEffect, useMemo, useState } from 'react';
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
  LoadingState,
  PageCard,
  PageHeader,
  PageLayout,
  PageSection,
} from '../../../components/shared/page';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { useAuth } from '../../../auth';
import AgentDeleteDialog from '../../../features/agents/components/AgentDeleteDialog';
import AgentDetailPanel from '../../../features/agents/components/AgentDetailPanel';
import AgentFormPanel from '../../../features/agents/components/AgentFormPanel';
import { formatLocalizedDate } from '../../../i18n/date-format';
import { usePersistentState } from '../../../lib/persistent-state';
import { services } from '../../../services';
import type {
  Agent,
  AgentMutationInput,
  EntityId,
  PaginationMeta,
  Product,
  SelectOption,
} from '../../../types/domain';

type ActiveFilter = 'all' | 'active' | 'inactive';
type AgentOrdering =
  | '-updated_at'
  | 'updated_at'
  | '-created_at'
  | 'created_at'
  | 'full_name'
  | '-full_name';

const PAGE_SIZE = 8;
const DEFAULT_ORDERING: AgentOrdering = '-updated_at';
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
  'inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface-card text-text-secondary shadow-sm ring-1 ring-border-soft/40 transition duration-fast hover:bg-surface-subtle hover:text-text-primary';

function getAgentName(agent: Agent): string {
  return (
    agent.fullName.trim() ||
    agent.telegramUsername ||
    agent.telegramChatId ||
    agent.id
  );
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function AgentsPage() {
  const { t, i18n } = useTranslation();
  const { hasPermission } = useAuth();
  const canManageAgents = hasPermission('can_manage_agents');
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';

  const [search, setSearch] = usePersistentState('agents:search', '');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [productFilters, setProductFilters] = useState<string[]>([]);
  const [ordering, setOrdering] = useState<AgentOrdering>(DEFAULT_ORDERING);
  const [currentPage, setCurrentPage] = useState(1);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>(
    DEFAULT_PAGINATION_META,
  );
  const [selectedAgentId, setSelectedAgentId] = useState<EntityId | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [reloadCursor, setReloadCursor] = useState(0);
  const [detailRefreshToken, setDetailRefreshToken] = useState(0);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);

  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeFilter, productFilters, ordering]);

  useEffect(() => {
    let isActive = true;

    async function loadProducts() {
      try {
        const result = await services.products.listProducts({
          page: 1,
          pageSize: 500,
          ordering: 'name',
        });
        if (!isActive) {
          return;
        }

        setProducts(result.items);
      } catch {
        if (!isActive) {
          return;
        }

        setProducts([]);
      }
    }

    void loadProducts();
    return () => {
      isActive = false;
    };
  }, [reloadCursor]);

  useEffect(() => {
    let isActive = true;

    async function loadAgents() {
      setIsLoading(true);
      setHasError(false);

      try {
        const result = await services.agents.list({
          page: currentPage,
          pageSize: PAGE_SIZE,
          search: search.trim() || undefined,
          is_active:
            activeFilter === 'all'
              ? undefined
              : activeFilter === 'active',
          ordering,
          products: productFilters.length > 0 ? productFilters : undefined,
        });

        if (!isActive) {
          return;
        }

        if (currentPage > result.meta.totalPages) {
          setCurrentPage(result.meta.totalPages);
          return;
        }

        setAgents(result.items);
        setPaginationMeta(result.meta);
      } catch {
        if (!isActive) {
          return;
        }

        setHasError(true);
        setAgents([]);
        setPaginationMeta(DEFAULT_PAGINATION_META);
      } finally {
        if (isActive) {
          setHasLoadedOnce(true);
          setIsLoading(false);
        }
      }
    }

    void loadAgents();
    return () => {
      isActive = false;
    };
  }, [activeFilter, currentPage, ordering, productFilters, reloadCursor, search]);

  useEffect(() => {
    if (selectedAgentId && !agents.some((agent) => agent.id === selectedAgentId)) {
      setSelectedAgentId(null);
    }
  }, [agents, selectedAgentId]);

  function openCreateForm() {
    if (!canManageAgents) {
      return;
    }

    setFormMode('create');
    setEditingAgent(null);
    setFormErrorMessage(null);
    setIsFormOpen(true);
  }

  function openEditForm(agent: Agent) {
    if (!canManageAgents) {
      return;
    }

    setFormMode('edit');
    setEditingAgent(agent);
    setFormErrorMessage(null);
    setIsFormOpen(true);
  }

  async function handleSaveAgent(payload: AgentMutationInput) {
    if (!canManageAgents) {
      return;
    }

    setIsSaving(true);
    setFormErrorMessage(null);

    try {
      if (formMode === 'create') {
        await services.agents.create(payload);
        setCurrentPage(1);
      } else {
        const editingAgentId = editingAgent?.id;
        if (!editingAgentId) {
          throw new Error(t('agents.form.saveError'));
        }

        const updated = await services.agents.update(editingAgentId, payload);
        if (!updated) {
          throw new Error(t('agents.form.saveError'));
        }

        setDetailRefreshToken((current) => current + 1);
      }

      setIsFormOpen(false);
      setEditingAgent(null);
      setReloadCursor((current) => current + 1);
    } catch (error) {
      setFormErrorMessage(extractErrorMessage(error, t('agents.form.saveError')));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!canManageAgents || !agentToDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      await services.agents.delete(agentToDelete.id);

      if (selectedAgentId === agentToDelete.id) {
        setSelectedAgentId(null);
      }

      setAgentToDelete(null);
      setReloadCursor((current) => current + 1);
    } finally {
      setIsDeleting(false);
    }
  }

  const handleToggleAgentActive = useCallback(
    async (agent: Agent): Promise<Agent | null> => {
      if (!canManageAgents) {
        return null;
      }

      const updated = await services.agents.patch(agent.id, {
        isActive: !agent.isActive,
      });
      if (!updated) {
        return null;
      }

      setAgents((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
      setReloadCursor((current) => current + 1);
      setDetailRefreshToken((current) => current + 1);

      return updated;
    },
    [canManageAgents],
  );

  const activeOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'all', label: t('agents.status.all') },
      { value: 'active', label: t('agents.status.active') },
      { value: 'inactive', label: t('agents.status.inactive') },
    ],
    [t],
  );

  const filterProducts = useMemo(
    () =>
      products
        .filter((product) => product.isActive)
        .sort((left, right) =>
          left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
        ),
    [products],
  );

  const productFilterLabel = useMemo(() => {
    if (productFilters.length === 0) {
      return t('agents.filters.allProducts');
    }

    if (productFilters.length === 1) {
      const selectedProduct = filterProducts.find(
        (product) => product.id === productFilters[0],
      );
      return selectedProduct?.name ?? t('agents.filters.allProducts');
    }

    return t('agents.filters.selectedProducts', { count: productFilters.length });
  }, [filterProducts, productFilters, t]);

  const orderingOptions = useMemo<SelectOption[]>(
    () => [
      { value: '-updated_at', label: t('agents.ordering.updatedNewest') },
      { value: 'updated_at', label: t('agents.ordering.updatedOldest') },
      { value: '-created_at', label: t('agents.ordering.createdNewest') },
      { value: 'created_at', label: t('agents.ordering.createdOldest') },
      { value: 'full_name', label: t('agents.ordering.nameAsc') },
      { value: '-full_name', label: t('agents.ordering.nameDesc') },
    ],
    [t],
  );

  const columns = useMemo<DataTableColumn<Agent>[]>(() => {
    const baseColumns: DataTableColumn<Agent>[] = [
      {
        key: 'agent',
        label: t('agents.columns.agent'),
        render: (agent) => (
          <div className="grid gap-0.5">
            <span className={tablePrimaryTextClassName}>{getAgentName(agent)}</span>
            <span className={tableSecondaryTextClassName}>
              {agent.telegramUsername
                ? `@${agent.telegramUsername}`
                : agent.telegramChatId || t('common.na')}
            </span>
          </div>
        ),
      },
      {
        key: 'phone',
        label: t('agents.columns.phone'),
        render: (agent) => (
          <span className={tablePrimaryTextClassName}>{agent.phone || t('common.na')}</span>
        ),
      },
      {
        key: 'products',
        label: t('agents.columns.products'),
        render: (agent) => (
          <span className={tablePrimaryTextClassName}>
            {agent.products.length > 0
              ? t('agents.productsCount', { count: agent.products.length })
              : t('agents.noProducts')}
          </span>
        ),
      },
      {
        key: 'status',
        label: t('agents.columns.status'),
        render: (agent) => (
          <StatusBadge
            status={agent.isActive ? 'active' : 'inactive'}
            tone={agent.isActive ? 'success' : 'neutral'}
            label={agent.isActive ? t('common.active') : t('common.inactive')}
          />
        ),
      },
      {
        key: 'updated',
        label: t('agents.columns.updated'),
        render: (agent) => (
          <span className={tablePrimaryTextClassName}>
            {formatLocalizedDate(agent.updatedAt, i18n.language, {
              locale,
              withYear: true,
              shortMonth: true,
              fallback: t('common.na'),
            })}
          </span>
        ),
      },
    ];

    return [
      ...baseColumns,
      ...(canManageAgents
        ? [
            {
              key: 'actions',
              label: t('agents.columns.actions'),
              align: 'right' as const,
              render: (agent: Agent) => (
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    className={actionButtonClassName}
                    onClick={(event) => {
                      event.stopPropagation();
                      openEditForm(agent);
                    }}
                    aria-label={`${t('agents.actions.edit')} ${getAgentName(agent)}`}
                  >
                    <FiEdit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className={actionButtonClassName}
                    onClick={(event) => {
                      event.stopPropagation();
                      setAgentToDelete(agent);
                    }}
                    aria-label={`${t('agents.actions.delete')} ${getAgentName(agent)}`}
                  >
                    <FiTrash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ),
            },
          ]
        : []),
    ];
  }, [canManageAgents, i18n.language, locale, t]);

  const activeFilterCount =
    Number(activeFilter !== 'all') + Number(productFilters.length > 0);

  const header = (
    <PageHeader
      eyebrow={t('agents.eyebrow')}
      title={t('agents.title')}
      subtitle={t('agents.subtitle')}
      actions={
        <div className="flex w-full flex-wrap items-center gap-2 min-[768px]:w-auto">
          {canManageAgents ? (
            <button
              type="button"
              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent"
              onClick={openCreateForm}
            >
              <AppIcon name="plus" className="h-4 w-4" aria-hidden="true" />
              {t('agents.newAgent')}
            </button>
          ) : null}
          <span className="inline-flex min-h-8 items-center gap-2 rounded-pill bg-primary/12 px-3 text-[12px] font-semibold text-text-accent">
            <AppIcon name="agents" className="h-3.5 w-3.5" aria-hidden="true" />
            {paginationMeta.totalItems} {t('agents.records')}
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
              title={t('agents.loadingTitle')}
              description={t('agents.loadingDescription')}
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
              title={t('agents.errorTitle')}
              description={t('agents.errorDescription')}
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
                {paginationMeta.totalItems} {t('agents.records')}
              </span>
              {activeFilterCount > 0 ? (
                <span className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary/12 px-3 text-sm font-semibold text-text-accent">
                  <AppIcon name="filter" className="h-4 w-4" aria-hidden="true" />
                  {activeFilterCount} {t('agents.activeFilters')}
                </span>
              ) : null}
              {selectedAgentId ? (
                <span className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-info-bg px-3 text-sm font-semibold text-info">
                  <AppIcon name="agents" className="h-4 w-4" aria-hidden="true" />
                  {t('agents.detailOpen')}
                </span>
              ) : null}
            </div>
          }
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t('agents.searchPlaceholder')}
          />

          <label className="grid min-w-[min(170px,100%)] flex-[1_1_170px] gap-1.5 min-[640px]:flex-[0_1_170px]">
            <span className={labelClassName}>{t('agents.filters.status')}</span>
            <FilterSelect
              value={activeFilter}
              options={activeOptions}
              onChange={(value) => setActiveFilter(value as ActiveFilter)}
              disabled={isLoading}
            />
          </label>

          <label className="grid min-w-[min(190px,100%)] flex-[1_1_190px] gap-1.5 min-[640px]:flex-[0_1_190px]">
            <span className={labelClassName}>{t('agents.filters.products')}</span>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={[
                    'inline-flex w-full items-center justify-between gap-3 rounded-lg border-0 bg-surface-card px-4 py-2.5 text-left text-sm font-medium text-text-primary shadow-sm outline-none transition duration-fast',
                    'hover:bg-surface-subtle/90 focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60',
                  ].join(' ')}
                  disabled={isLoading}
                  aria-label={t('agents.filters.products')}
                >
                  <span className="truncate">{productFilterLabel}</span>
                  <AppIcon
                    name="chevron-down"
                    className="h-4 w-4 shrink-0 text-text-muted"
                    aria-hidden="true"
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[300px] p-2">
                <div className="grid gap-1.5">
                  <button
                    type="button"
                    className={[
                      'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition duration-fast',
                      productFilters.length === 0
                        ? 'bg-primary/12 text-text-primary'
                        : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary',
                    ].join(' ')}
                    onClick={() => setProductFilters([])}
                  >
                    <span>{t('agents.filters.allProducts')}</span>
                    {productFilters.length === 0 ? (
                      <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                    ) : null}
                  </button>

                  <div className="max-h-64 overflow-y-auto pr-1">
                    <div className="grid gap-1">
                      {filterProducts.map((product) => {
                        const isSelected = productFilters.includes(product.id);
                        return (
                          <button
                            key={product.id}
                            type="button"
                            className={[
                              'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition duration-fast',
                              isSelected
                                ? 'bg-primary/12 text-text-primary'
                                : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary',
                            ].join(' ')}
                            onClick={() =>
                              setProductFilters((current) =>
                                current.includes(product.id)
                                  ? current.filter((id) => id !== product.id)
                                  : [...current, product.id],
                              )
                            }
                          >
                            <span className="truncate">{product.name}</span>
                            {isSelected ? (
                              <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </label>

          <label className="grid min-w-[min(190px,100%)] flex-[1_1_190px] gap-1.5 min-[640px]:flex-[0_1_190px]">
            <span className={labelClassName}>{t('agents.filters.orderBy')}</span>
            <FilterSelect
              value={ordering}
              options={orderingOptions}
              onChange={(value) => setOrdering(value as AgentOrdering)}
              disabled={isLoading}
            />
          </label>
        </FilterBar>
      </PageSection>

      <PageSection>
        <PageCard>
          <div className="mb-3">
            <h2 className="m-0 text-[1.04rem] font-semibold text-text-primary">
              {t('agents.boardTitle')}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {t('agents.boardHint')}
            </p>
          </div>

          <DataTable
            data={agents}
            columns={columns}
            rowKey={(agent) => agent.id}
            selectedRowKey={selectedAgentId}
            onRowClick={(agent) => setSelectedAgentId(agent.id)}
            emptyTitle={t('agents.emptyTitle')}
            emptyDescription={t('agents.emptyDescription')}
            loading={isLoading}
          />

          <div className="mt-3">
            <Pagination
              currentPage={paginationMeta.page}
              totalPages={paginationMeta.totalPages}
              totalItems={paginationMeta.totalItems}
              onPageChange={setCurrentPage}
            />
          </div>
        </PageCard>
      </PageSection>

      {selectedAgentId ? (
        <AgentDetailPanel
          agentId={selectedAgentId}
          refreshToken={detailRefreshToken}
          canManageAgents={canManageAgents}
          onClose={() => setSelectedAgentId(null)}
          onEdit={openEditForm}
          onDelete={(agent) => setAgentToDelete(agent)}
          onToggleActive={handleToggleAgentActive}
        />
      ) : null}

      {isFormOpen ? (
        <AgentFormPanel
          mode={formMode}
          agent={editingAgent}
          products={products}
          isSubmitting={isSaving}
          errorMessage={formErrorMessage}
          onClose={() => {
            if (!isSaving) {
              setIsFormOpen(false);
              setEditingAgent(null);
              setFormErrorMessage(null);
            }
          }}
          onSubmit={handleSaveAgent}
        />
      ) : null}

      {agentToDelete ? (
        <AgentDeleteDialog
          agent={agentToDelete}
          isDeleting={isDeleting}
          onCancel={() => {
            if (!isDeleting) {
              setAgentToDelete(null);
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

export default AgentsPage;
