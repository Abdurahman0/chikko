import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import FilterSelect from '../../../components/shared/data/FilterSelect';
import AppIcon from '../../../components/shared/icons/AppIcon';
import {
  EmptyState,
  LoadingState,
  PageCard,
  PageHeader,
  PageLayout,
  PageSection,
} from '../../../components/shared/page';
import { getUserRoleLabel, getUserStatusLabel } from '../../../i18n/labels';
import { services } from '../../../services';
import type { AppUser, SelectOption } from '../../../types/domain';
import type { UserRole } from '../../../types/user';

interface ProfileFormData {
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  password: string;
  confirmPassword: string;
}

const ROLE_STYLES: Record<UserRole, { bg: string; text: string }> = {
  developer: { bg: 'bg-purple-500/12', text: 'text-purple-600 dark:text-purple-400' },
  admin: { bg: 'bg-primary/12', text: 'text-primary' },
  operator: { bg: 'bg-neutral-bg', text: 'text-text-secondary' },
};

const labelClassName = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';
const valueClassName = 'text-sm font-medium text-text-primary [overflow-wrap:anywhere]';
const fieldRowClassName = 'flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3.5 py-3';

const inputClassName = [
  'w-full rounded-lg border border-border-soft/60 bg-surface-card px-3.5 py-2.5 text-sm font-medium text-text-primary',
  'placeholder:text-text-muted outline-none transition duration-fast',
  'focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

const btnPrimaryClassName = [
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground',
  'transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
  'disabled:opacity-50 disabled:pointer-events-none',
].join(' ');

const btnSecondaryClassName = [
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-surface-card px-4 text-sm font-semibold text-text-secondary',
  'shadow-sm ring-1 ring-border-soft/40 transition duration-fast hover:bg-surface-subtle hover:text-text-primary',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
].join(' ');

const toggleClassName = (active: boolean) => [
  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2',
  active ? 'bg-primary' : 'bg-border-soft/80',
].join(' ');

const toggleDotClassName = (active: boolean) => [
  'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out',
  active ? 'translate-x-5' : 'translate-x-0',
].join(' ');

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatDate(
  timestamp: string | undefined,
  locale: string,
  fallback: string,
): string {
  if (!timestamp) {
    return fallback;
  }

  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(timestamp));
}

function RoleBadge({ role }: { role: UserRole }) {
  const { t } = useTranslation();
  const style = ROLE_STYLES[role] ?? ROLE_STYLES.operator;

  return (
    <span className={`inline-flex min-h-7 items-center rounded-pill px-3 text-[11px] font-semibold uppercase tracking-[0.08em] ${style.bg} ${style.text}`}>
      {getUserRoleLabel(t, role)}
    </span>
  );
}

function ProfilePage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';
  const roleOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'developer', label: getUserRoleLabel(t, 'developer') },
      { value: 'admin', label: getUserRoleLabel(t, 'admin') },
      { value: 'operator', label: getUserRoleLabel(t, 'operator') },
    ],
    [t],
  );
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [form, setForm] = useState<ProfileFormData>({
    fullName: '',
    email: '',
    phone: '',
    role: 'operator',
    isActive: true,
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      setHasError(false);

      try {
        const currentUser = await services.profile.getCurrentUser();
        if (!active) {
          return;
        }

        setUser(currentUser);
        if (currentUser) {
          setForm({
            fullName: currentUser.fullName,
            email: currentUser.email,
            phone: currentUser.phone ?? '',
            role: currentUser.role,
            isActive: currentUser.status !== 'inactive',
            password: '',
            confirmPassword: '',
          });
        }
      } catch {
        if (!active) {
          return;
        }
        setHasError(true);
        setUser(null);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  function handleEdit() {
    if (user) {
      setForm({
        fullName: user.fullName,
        email: user.email,
        phone: user.phone ?? '',
        role: user.role,
        isActive: user.status !== 'inactive',
        password: '',
        confirmPassword: '',
      });
      setShowPasswordSection(false);
    }
    setIsEditing(true);
  }

  function handleCancel() {
    setIsEditing(false);
    setShowPasswordSection(false);
  }

  function handleSave() {
    if (form.password && form.password !== form.confirmPassword) {
      return;
    }

    setIsSaving(true);
    const payload: Record<string, unknown> = {
      email: form.email,
      full_name: form.fullName,
      phone: form.phone,
      role: form.role,
      is_active: form.isActive,
    };
    if (form.password) {
      payload.password = form.password;
    }
    console.log('[ProfilePage] Save payload:', payload);

    setTimeout(() => {
      if (user) {
        setUser({
          ...user,
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          role: form.role,
          status: form.isActive ? 'active' : 'inactive',
        });
      }
      setIsSaving(false);
      setIsEditing(false);
      setShowPasswordSection(false);
    }, 400);
  }

  const passwordMismatch = form.password.length > 0 && form.password !== form.confirmPassword;

  const header = (
    <PageHeader
      eyebrow={t('profile.eyebrow')}
      title={t('profile.title')}
      subtitle={t('profile.subtitle')}
      actions={
        !isEditing && user ? (
          <button type="button" className={btnPrimaryClassName} onClick={handleEdit}>
            <AppIcon name="user" className="h-4 w-4" aria-hidden="true" />
            {t('profile.editProfile')}
          </button>
        ) : null
      }
    />
  );

  if (isLoading) {
    return (
      <PageLayout header={header}>
        <LoadingState
          title={t('profile.loadingTitle')}
          description={t('profile.loadingDescription')}
        />
      </PageLayout>
    );
  }

  if (hasError || !user) {
    return (
      <PageLayout header={header}>
        <EmptyState
          title={t('profile.errorTitle')}
          description={t('profile.errorDescription')}
        />
      </PageLayout>
    );
  }

  const permissions = user.permissionKeys ?? [];

  return (
    <PageLayout header={header}>
      <div className="grid gap-4 min-[768px]:gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid content-start gap-4 min-[768px]:gap-5">
          <PageCard>
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary ring-4 ring-primary/8">
                <span className="font-display text-[1.5rem] font-extrabold tracking-[-0.02em]">
                  {getInitials(user.fullName)}
                </span>
              </div>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <h2 className="m-0 font-display text-[1.4rem] font-extrabold leading-tight tracking-[-0.02em] text-text-primary">
                  {user.fullName}
                </h2>
                <p className="mt-1 text-sm text-text-secondary">{user.email}</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <RoleBadge role={user.role} />
                  <span className={`inline-flex min-h-7 items-center rounded-pill px-3 text-[11px] font-semibold uppercase tracking-[0.08em] ${user.status === 'inactive' ? 'bg-danger-bg text-danger' : 'bg-success-bg text-success'}`}>
                    {getUserStatusLabel(t, user.status)}
                  </span>
                </div>
              </div>
            </div>
          </PageCard>

          <PageCard>
            <PageSection
              title={
                isEditing
                  ? t('profile.sections.editProfile')
                  : t('profile.sections.contactInformation')
              }
            >
              {isEditing ? (
                <div className="grid gap-4">
                  <label className="grid gap-1.5">
                    <span className={labelClassName}>{t('profile.fields.fullName')}</span>
                    <input
                      type="text"
                      className={inputClassName}
                      value={form.fullName}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, fullName: event.target.value }))
                      }
                      placeholder={t('profile.placeholders.fullName')}
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className={labelClassName}>{t('profile.fields.email')}</span>
                    <input
                      type="email"
                      className={inputClassName}
                      value={form.email}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, email: event.target.value }))
                      }
                      placeholder={t('profile.placeholders.email')}
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className={labelClassName}>{t('profile.fields.phone')}</span>
                    <input
                      type="tel"
                      className={inputClassName}
                      value={form.phone}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, phone: event.target.value }))
                      }
                      placeholder={t('profile.placeholders.phone')}
                    />
                  </label>

                  <div className="grid gap-1.5">
                    <span className={labelClassName}>{t('profile.fields.role')}</span>
                    <FilterSelect
                      value={form.role}
                      options={roleOptions}
                      onChange={(value) =>
                        setForm((prev) => ({ ...prev, role: value as UserRole }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-card px-4 py-4 ring-1 ring-border-soft/30">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${form.isActive ? 'bg-success-bg' : 'bg-danger-bg'} transition-colors duration-200`}>
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${form.isActive ? 'bg-success' : 'bg-danger'} transition-colors duration-200`} />
                      </span>
                      <div>
                        <p className="m-0 text-sm font-semibold text-text-primary">
                          {t('profile.accountStatus.title')}
                        </p>
                        <p className="m-0 mt-0.5 text-[12px] text-text-muted">
                          {form.isActive
                            ? t('profile.accountStatus.activeHint')
                            : t('profile.accountStatus.inactiveHint')}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.isActive}
                      className={toggleClassName(form.isActive)}
                      onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                    >
                      <span className={toggleDotClassName(form.isActive)} />
                    </button>
                  </div>

                  {!showPasswordSection ? (
                    <button
                      type="button"
                      className={btnSecondaryClassName}
                      onClick={() => setShowPasswordSection(true)}
                    >
                      <AppIcon name="settings" className="h-4 w-4" aria-hidden="true" />
                      {t('profile.actions.changePassword')}
                    </button>
                  ) : (
                    <div className="grid gap-3 rounded-xl bg-surface-subtle/60 p-4 ring-1 ring-border-soft/30">
                      <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                        {t('profile.password.newPasswordTitle')}
                      </p>
                      <label className="grid gap-1.5">
                        <span className="text-[12px] font-medium text-text-secondary">
                          {t('profile.password.password')}
                        </span>
                        <input
                          type="password"
                          className={inputClassName}
                          value={form.password}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, password: event.target.value }))
                          }
                          placeholder={t('profile.placeholders.password')}
                          minLength={8}
                        />
                      </label>
                      <label className="grid gap-1.5">
                        <span className="text-[12px] font-medium text-text-secondary">
                          {t('profile.password.confirmPassword')}
                        </span>
                        <input
                          type="password"
                          className={`${inputClassName} ${passwordMismatch ? 'border-danger/60 focus:border-danger/60 focus:ring-danger/20' : ''}`}
                          value={form.confirmPassword}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                          }
                          placeholder={t('profile.placeholders.confirmPassword')}
                        />
                      </label>
                      {passwordMismatch ? (
                        <p className="m-0 text-[12px] font-medium text-danger">
                          {t('profile.password.mismatch')}
                        </p>
                      ) : null}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      className={btnPrimaryClassName}
                      onClick={handleSave}
                      disabled={isSaving || passwordMismatch}
                    >
                      {isSaving ? t('profile.actions.saving') : t('profile.actions.saveChanges')}
                    </button>
                    <button
                      type="button"
                      className={btnSecondaryClassName}
                      onClick={handleCancel}
                      disabled={isSaving}
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-2">
                  <div className={fieldRowClassName}>
                    <span className={labelClassName}>{t('profile.fields.fullName')}</span>
                    <span className={valueClassName}>{user.fullName}</span>
                  </div>
                  <div className={fieldRowClassName}>
                    <span className={labelClassName}>{t('profile.fields.email')}</span>
                    <span className={valueClassName}>{user.email}</span>
                  </div>
                  <div className={fieldRowClassName}>
                    <span className={labelClassName}>{t('profile.fields.phone')}</span>
                    <span className={valueClassName}>{user.phone || t('profile.notSet')}</span>
                  </div>
                  <div className={fieldRowClassName}>
                    <span className={labelClassName}>{t('profile.fields.role')}</span>
                    <RoleBadge role={user.role} />
                  </div>
                  <div className={fieldRowClassName}>
                    <span className={labelClassName}>{t('profile.fields.status')}</span>
                    <span className={`inline-flex min-h-7 items-center rounded-pill px-3 text-[11px] font-semibold uppercase tracking-[0.08em] ${user.status === 'inactive' ? 'bg-danger-bg text-danger' : 'bg-success-bg text-success'}`}>
                      {getUserStatusLabel(t, user.status)}
                    </span>
                  </div>
                </div>
              )}
            </PageSection>
          </PageCard>
        </div>

        <div className="grid content-start gap-4 min-[768px]:gap-5">
          <PageCard>
            <PageSection title={t('profile.sections.accountDetails')}>
              <div className="grid gap-2">
                <div className={fieldRowClassName}>
                  <span className={labelClassName}>{t('profile.fields.userId')}</span>
                  <span className="font-mono text-[12px] text-text-muted">{user.id}</span>
                </div>
                <div className={fieldRowClassName}>
                  <span className={labelClassName}>{t('profile.fields.role')}</span>
                  <RoleBadge role={user.role} />
                </div>
                <div className={fieldRowClassName}>
                  <span className={labelClassName}>{t('profile.fields.joined')}</span>
                  <span className={valueClassName}>
                    {formatDate(user.createdAt, locale, t('common.na'))}
                  </span>
                </div>
                <div className={fieldRowClassName}>
                  <span className={labelClassName}>{t('profile.fields.lastActive')}</span>
                  <span className={valueClassName}>
                    {formatDate(user.lastActiveAt, locale, t('common.na'))}
                  </span>
                </div>
              </div>
            </PageSection>
          </PageCard>

          <PageCard>
            <PageSection title={t('profile.sections.permissions')}>
              {permissions.length > 0 ? (
                <div className="flex max-h-[200px] flex-wrap gap-2 overflow-y-auto pr-1">
                  {permissions.map((permission) => (
                    <span
                      key={permission}
                      className="inline-flex min-h-7 items-center rounded-pill bg-primary/8 px-3 text-[11px] font-semibold tracking-[0.04em] text-text-accent"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg bg-surface-subtle/80 px-3.5 py-3">
                  <p className="m-0 text-sm text-text-secondary">
                    {user.role === 'developer'
                      ? t('profile.permissions.fullAccess')
                      : t('profile.permissions.noneAssigned')}
                  </p>
                </div>
              )}
            </PageSection>
          </PageCard>

          <PageCard>
            <PageSection title={t('profile.sections.security')}>
              <div className="grid gap-3">
                <p className="m-0 text-sm text-text-secondary">
                  {t('profile.security.description')}
                </p>
                {!isEditing ? (
                  <button type="button" className={btnSecondaryClassName} onClick={handleEdit}>
                    <AppIcon name="settings" className="h-4 w-4" aria-hidden="true" />
                    {t('profile.actions.changePassword')}
                  </button>
                ) : (
                  <p className="m-0 text-[12px] text-text-muted">
                    {t('profile.password.editModeHint')}
                  </p>
                )}
              </div>
            </PageSection>
          </PageCard>
        </div>
      </div>
    </PageLayout>
  );
}

export default ProfilePage;
