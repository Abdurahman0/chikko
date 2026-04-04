import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '../../../components/shared/data';
import AppIcon from '../../../components/shared/icons/AppIcon';
import type { Agent, AgentMutationInput, EntityId, Product } from '../../../types/domain';

interface AgentFormPanelProps {
  mode: 'create' | 'edit';
  agent?: Agent | null;
  products: Product[];
  isSubmitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (payload: AgentMutationInput) => void;
}

const inputClassName = [
  'w-full rounded-lg border border-border-soft/60 bg-surface-card px-3.5 py-2.5 text-sm font-medium text-text-primary',
  'placeholder:text-text-muted outline-none transition duration-fast',
  'focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
  'disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

function createInitialProductIds(agent: Agent | null | undefined): EntityId[] {
  if (!agent) {
    return [];
  }

  return agent.products.map((product) => product.id);
}

function AgentFormPanel({
  mode,
  agent,
  products,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}: AgentFormPanelProps) {
  const { t } = useTranslation();

  const [fullName, setFullName] = useState(agent?.fullName ?? '');
  const [phone, setPhone] = useState(agent?.phone ?? '');
  const [telegramChatId, setTelegramChatId] = useState(agent?.telegramChatId ?? '');
  const [telegramUsername, setTelegramUsername] = useState(agent?.telegramUsername ?? '');
  const [isActive, setIsActive] = useState(agent?.isActive ?? true);
  const [selectedProductIds, setSelectedProductIds] = useState<EntityId[]>(() =>
    createInitialProductIds(agent),
  );
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    setFullName(agent?.fullName ?? '');
    setPhone(agent?.phone ?? '');
    setTelegramChatId(agent?.telegramChatId ?? '');
    setTelegramUsername(agent?.telegramUsername ?? '');
    setIsActive(agent?.isActive ?? true);
    setSelectedProductIds(createInitialProductIds(agent));
    setFieldError(null);
  }, [agent, mode]);

  const sortedProducts = useMemo(
    () =>
      [...products].sort((left, right) =>
        left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
      ),
    [products],
  );

  function toggleProduct(productId: EntityId) {
    setSelectedProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);

    const normalizedFullName = fullName.trim();
    if (!normalizedFullName) {
      setFieldError(t('agents.form.fullNameRequired'));
      return;
    }

    onSubmit({
      fullName: normalizedFullName,
      phone: phone.trim(),
      telegramChatId: telegramChatId.trim(),
      telegramUsername: telegramUsername.trim().replace(/^@+/, ''),
      isActive,
      productIds: selectedProductIds,
      metadata: mode === 'edit' ? agent?.metadata : undefined,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-background-overlay/72 backdrop-blur-[3px]"
      onClick={() => !isSubmitting && onClose()}
      role="presentation"
    >
      <aside
        className="h-full w-full overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:max-w-[640px] min-[641px]:p-5"
        onClick={(event) => event.stopPropagation()}
        aria-label={mode === 'create' ? t('agents.form.titleCreate') : t('agents.form.titleEdit')}
      >
        <header className="mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t('agents.form.eyebrow')}
              </p>
              <h2 className="mt-1 font-display text-[1.45rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-text-primary">
                {mode === 'create' ? t('agents.form.titleCreate') : t('agents.form.titleEdit')}
              </h2>
            </div>
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary shadow-sm transition duration-fast hover:bg-surface-muted"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label={t('agents.form.close')}
            >
              <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <form className="grid gap-3" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="agent-form-full-name">
                {t('agents.form.fullName')}
              </label>
              <input
                id="agent-form-full-name"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className={inputClassName}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="agent-form-phone">
                {t('agents.form.phone')}
              </label>
              <input
                id="agent-form-phone"
                type="text"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className={inputClassName}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="agent-form-telegram-chat-id">
                {t('agents.form.telegramChatId')}
              </label>
              <input
                id="agent-form-telegram-chat-id"
                type="text"
                value={telegramChatId}
                onChange={(event) => setTelegramChatId(event.target.value)}
                className={inputClassName}
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="agent-form-telegram-username">
                {t('agents.form.telegramUsername')}
              </label>
              <input
                id="agent-form-telegram-username"
                type="text"
                value={telegramUsername}
                onChange={(event) => setTelegramUsername(event.target.value)}
                className={inputClassName}
                disabled={isSubmitting}
                placeholder="username"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-card px-4 py-4 ring-1 ring-border-soft/35">
            <div className="grid gap-0.5">
              <p className="m-0 text-sm font-semibold text-text-primary">
                {t('agents.form.isActive')}
              </p>
              <p className="m-0 text-[12px] text-text-secondary">
                {t('agents.form.isActiveHint')}
              </p>
            </div>
            <Switch
              checked={isActive}
              onChange={setIsActive}
              disabled={isSubmitting}
              ariaLabel={t('agents.form.isActive')}
            />
          </div>

          <div className="grid gap-2.5 rounded-xl bg-surface-card px-4 py-4 ring-1 ring-border-soft/35">
            <div className="grid gap-0.5">
              <p className="m-0 text-sm font-semibold text-text-primary">
                {t('agents.form.products')}
              </p>
              <p className="m-0 text-[12px] text-text-secondary">
                {t('agents.form.productsHint')}
              </p>
            </div>

            {sortedProducts.length > 0 ? (
              <div className="grid max-h-[220px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {sortedProducts.map((product) => {
                  const isSelected = selectedProductIds.includes(product.id);

                  return (
                    <button
                      key={product.id}
                      type="button"
                      className={[
                        'rounded-lg px-3 py-2.5 text-left text-sm ring-1 transition duration-fast',
                        isSelected
                          ? 'bg-primary/10 text-text-primary ring-primary/35'
                          : 'bg-surface-subtle/85 text-text-secondary ring-border-soft/45 hover:bg-surface-muted',
                      ].join(' ')}
                      onClick={() => toggleProduct(product.id)}
                      disabled={isSubmitting}
                      aria-pressed={isSelected}
                    >
                      <span className="block truncate font-semibold">{product.name}</span>
                      <span className="mt-0.5 block truncate text-[12px]">{product.sku || product.id}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="m-0 rounded-lg bg-surface-subtle/85 px-3 py-2.5 text-sm text-text-secondary">
                {t('agents.form.noProducts')}
              </p>
            )}
          </div>

          {fieldError ? (
            <p className="m-0 rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
              {fieldError}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="m-0 rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? mode === 'create'
                  ? t('agents.form.creating')
                  : t('agents.form.saving')
                : mode === 'create'
                  ? t('agents.form.createSubmit')
                  : t('agents.form.editSubmit')}
            </button>
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-surface-subtle px-4 text-sm font-semibold text-text-secondary transition duration-fast hover:bg-surface-muted"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

export default AgentFormPanel;
