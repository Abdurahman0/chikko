import { useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '../../../components/shared/data';
import AppIcon from '../../../components/shared/icons/AppIcon';
import { EmptyState, LoadingState, PageCard } from '../../../components/shared/page';
import { formatLocalizedDate } from '../../../i18n/date-format';
import { services } from '../../../services';
import type { Agent, EntityId } from '../../../types/domain';

interface AgentDetailPanelProps {
  agentId: EntityId;
  refreshToken?: number;
  canManageAgents: boolean;
  onClose: () => void;
  onEdit: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
  onToggleActive: (agent: Agent) => Promise<Agent | null>;
}

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

function getAgentName(agent: Agent): string {
  return (
    agent.fullName.trim() ||
    agent.telegramUsername ||
    agent.telegramChatId ||
    agent.id
  );
}

function formatDate(value: string | undefined, language: string, locale: string): string {
  return formatLocalizedDate(value, language, {
    locale,
    withYear: true,
    withTime: true,
    shortMonth: true,
    fallback: 'N/A',
  });
}

function AgentDetailPanel({
  agentId,
  refreshToken = 0,
  canManageAgents,
  onClose,
  onEdit,
  onDelete,
  onToggleActive,
}: AgentDetailPanelProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';

  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadAgent() {
      setIsLoading(true);
      setHasError(false);

      try {
        const nextAgent = await services.agents.getById(agentId);
        if (!isActive) {
          return;
        }

        setAgent(nextAgent);
      } catch {
        if (!isActive) {
          return;
        }

        setHasError(true);
        setAgent(null);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadAgent();

    return () => {
      isActive = false;
    };
  }, [agentId, refreshToken]);

  const metadataEntries = useMemo(() => {
    if (!agent?.metadata) {
      return [];
    }

    return Object.entries(agent.metadata);
  }, [agent?.metadata]);

  async function handleToggle() {
    if (!canManageAgents || !agent || isToggling) {
      return;
    }

    setIsToggling(true);
    try {
      const updated = await onToggleActive(agent);
      if (updated) {
        setAgent(updated);
      }
    } finally {
      setIsToggling(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-background-overlay/72 backdrop-blur-[3px]"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="h-full w-full overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:max-w-[560px] min-[641px]:p-5"
        onClick={(event) => event.stopPropagation()}
        aria-label={t('agents.detail.ariaLabel')}
      >
        <header className="mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t('agents.detail.title')}
              </p>
              <h2 className="mt-1 font-display text-[1.45rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-text-primary [overflow-wrap:anywhere]">
                {agent ? getAgentName(agent) : t('agents.detail.title')}
              </h2>
              {agent?.phone ? (
                <p className="mt-1 text-sm text-text-secondary">{agent.phone}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary"
              onClick={onClose}
              aria-label={t('agents.detail.close')}
            >
              <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>
          {agent ? (
            <div className="mt-3">
              <StatusBadge
                status={agent.isActive ? 'active' : 'inactive'}
                tone={agent.isActive ? 'success' : 'neutral'}
                label={agent.isActive ? t('common.active') : t('common.inactive')}
              />
            </div>
          ) : null}
        </header>

        <div className="grid gap-3">
          {isLoading ? (
            <LoadingState
              title={t('agents.detail.loadingTitle')}
              description={t('agents.detail.loadingDescription')}
            />
          ) : null}
          {!isLoading && (hasError || !agent) ? (
            <EmptyState
              title={t('agents.detail.errorTitle')}
              description={t('agents.detail.errorDescription')}
            />
          ) : null}

          {!isLoading && agent ? (
            <>
              <PageCard>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="rounded-lg bg-surface-subtle/80 p-3">
                    <p className={labelClassName}>{t('agents.columns.telegramChatId')}</p>
                    <p className="m-0 mt-1 text-sm font-semibold text-text-primary">
                      {agent.telegramChatId || t('common.na')}
                    </p>
                  </div>
                  <div className="rounded-lg bg-surface-subtle/80 p-3">
                    <p className={labelClassName}>{t('agents.columns.telegramUsername')}</p>
                    <p className="m-0 mt-1 text-sm font-semibold text-text-primary">
                      {agent.telegramUsername ? `@${agent.telegramUsername}` : t('common.na')}
                    </p>
                  </div>
                </div>
              </PageCard>

              <PageCard>
                <div className="grid gap-2.5">
                  <p className={labelClassName}>{t('agents.detail.products')}</p>
                  {agent.products.length > 0 ? (
                    <div className="flex max-h-[200px] flex-wrap gap-2 overflow-y-auto pr-1">
                      {agent.products.map((product) => (
                        <span
                          key={product.id}
                          className="inline-flex min-h-7 items-center rounded-pill bg-primary/10 px-3 text-[11px] font-semibold tracking-[0.04em] text-text-accent"
                        >
                          {product.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="m-0 rounded-lg bg-surface-subtle/85 px-3 py-2.5 text-sm text-text-secondary">
                      {t('agents.detail.noProducts')}
                    </p>
                  )}
                </div>
              </PageCard>

              <PageCard>
                <div className="grid gap-2.5">
                  <p className={labelClassName}>{t('agents.detail.metadata')}</p>
                  {metadataEntries.length > 0 ? (
                    <div className="grid gap-2">
                      {metadataEntries.map(([key, value]) => (
                        <div
                          key={key}
                          className="rounded-lg bg-surface-subtle/80 px-3 py-2.5"
                        >
                          <p className={labelClassName}>{key}</p>
                          <p className="m-0 mt-1 text-sm font-semibold text-text-primary [overflow-wrap:anywhere]">
                            {String(value ?? '') || t('common.na')}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="m-0 rounded-lg bg-surface-subtle/85 px-3 py-2.5 text-sm text-text-secondary">
                      {t('agents.detail.noMetadata')}
                    </p>
                  )}
                </div>
              </PageCard>

              <PageCard>
                <dl className="m-0 grid gap-2">
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5">
                    <dt className={labelClassName}>{t('agents.detail.created')}</dt>
                    <dd className="m-0 text-sm font-semibold text-text-primary">
                      {formatDate(agent.createdAt, i18n.language, locale)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5">
                    <dt className={labelClassName}>{t('agents.detail.updated')}</dt>
                    <dd className="m-0 text-sm font-semibold text-text-primary">
                      {formatDate(agent.updatedAt, i18n.language, locale)}
                    </dd>
                  </div>
                </dl>
              </PageCard>

              {canManageAgents ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
                    onClick={() => onEdit(agent)}
                  >
                    <FiEdit2 className="h-4 w-4" /> {t('agents.actions.edit')}
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-info px-4 text-sm font-semibold text-white disabled:opacity-60"
                    onClick={() => {
                      void handleToggle();
                    }}
                    disabled={isToggling}
                  >
                    <FiRefreshCw className="h-4 w-4" />{' '}
                    {agent.isActive ? t('agents.actions.setInactive') : t('agents.actions.setActive')}
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-danger px-4 text-sm font-semibold text-white"
                    onClick={() => onDelete(agent)}
                  >
                    <FiTrash2 className="h-4 w-4" /> {t('agents.actions.delete')}
                  </button>
                </div>
              ) : (
                <p className="m-0 rounded-lg bg-surface-subtle/90 px-3 py-2.5 text-sm text-text-secondary">
                  {t('agents.detail.readOnlyHint')}
                </p>
              )}
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

export default AgentDetailPanel;
