import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppIcon from '../components/shared/icons/AppIcon';
import { useAuth } from '../auth';
import { routePaths } from '../config/routes';
import { SUPPORTED_LANGUAGES } from '../i18n';

interface AppTopbarProps {
  title: string;
  subtitle: string;
  onMenuToggle: () => void;
}

const THEME_STORAGE_KEY = 'chikko-theme';

function getInitialIsDarkTheme() {
  if (typeof window === 'undefined') {
    return false;
  }

  const rootTheme = document.documentElement.dataset.theme;

  if (rootTheme === 'dark') {
    return true;
  }

  if (rootTheme === 'light') {
    return false;
  }

  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
  } catch {
    return false;
  }
}

const menuToggleClassName = [
  'inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface-card text-text-primary transition',
  'duration-fast hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-0',
  'min-[960px]:hidden',
].join(' ');

const topbarIconButtonClassName = [
  'hidden h-10 w-10 items-center justify-center rounded-full bg-surface-card text-text-secondary transition duration-fast',
  'hover:bg-primary/10 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 min-[960px]:inline-flex',
].join(' ');

function AppTopbar({ title, subtitle, onMenuToggle }: AppTopbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [isDarkTheme, setIsDarkTheme] = useState(getInitialIsDarkTheme);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const { currentUser, logout } = useAuth();

  useEffect(() => {
    const nextTheme = isDarkTheme ? 'dark' : 'light';

    document.documentElement.dataset.theme = nextTheme;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Ignore storage failures and keep the in-memory toggle working.
    }
  }, [isDarkTheme]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setIsProfileMenuOpen(false);
  }, [location.pathname]);

  function handleOpenProfile() {
    setIsProfileMenuOpen(false);
    navigate(routePaths.profile);
  }

  function handleLogout() {
    setIsProfileMenuOpen(false);
    logout();
    navigate(routePaths.login, { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 flex min-h-topbar items-center justify-between gap-3 border-b border-border-soft/55 bg-background-default px-5 py-3 backdrop-blur-shell supports-[backdrop-filter]:bg-background-default/78 max-[640px]:flex-wrap min-[960px]:px-7">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          className={menuToggleClassName}
          onClick={onMenuToggle}
          aria-label={t('topbar.menuOpen')}
        >
          <AppIcon name="menu" className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-2 text-text-muted max-[640px]:ml-auto">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-card text-text-secondary transition duration-fast hover:bg-primary/10 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          onClick={() => setIsDarkTheme((current) => !current)}
          aria-pressed={isDarkTheme}
          aria-label={t('topbar.themeToggle')}
        >
          <AppIcon
            name={isDarkTheme ? 'moon' : 'sun'}
            className="h-5 w-5"
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          className={topbarIconButtonClassName}
          aria-label={t('topbar.notifications')}
        >
          <AppIcon name="bell" className="h-5 w-5" aria-hidden="true" />
        </button>

        <div
          ref={profileMenuRef}
          className={['relative', isProfileMenuOpen ? 'z-[120]' : 'z-20'].join(' ')}
        >
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-pill bg-surface-card px-2.5 text-text-secondary shadow-sm ring-1 ring-border-soft/40 transition duration-fast hover:bg-primary/10 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 min-[960px]:h-11 min-[960px]:gap-3 min-[960px]:px-3.5"
            aria-haspopup="menu"
            aria-expanded={isProfileMenuOpen}
            aria-label={t('topbar.profileMenu')}
            onClick={() => setIsProfileMenuOpen((current) => !current)}
          >
            <span className="hidden min-[960px]:grid text-right text-[11px] leading-[1.25]">
              <span className="font-semibold text-text-primary">
                {currentUser?.fullName ?? t('common.notAvailable')}
              </span>
              <span className="text-text-muted">
                {currentUser?.role ?? t('topbar.noRole')}
              </span>
            </span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <AppIcon name="user" className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <AppIcon
              name="chevron-down"
              className={[
                'hidden h-4 w-4 text-text-muted transition duration-fast min-[960px]:inline-flex',
                isProfileMenuOpen ? 'rotate-180 text-text-secondary' : '',
              ].join(' ')}
              aria-hidden="true"
            />
          </button>

          {isProfileMenuOpen ? (
            <div
              className="absolute right-0 top-[calc(100%+10px)] w-[220px] overflow-hidden rounded-xl bg-surface-card p-1.5 shadow-[0_22px_44px_-30px_rgba(25,28,30,0.38)] ring-1 ring-border-soft/40"
              role="menu"
              aria-label={t('topbar.profileMenu')}
            >
              <div className="rounded-lg bg-surface-subtle/70 px-3 py-2.5">
                <p className="m-0 text-sm font-semibold text-text-primary">
                  {currentUser?.fullName ?? t('common.notAvailable')}
                </p>
                <p className="m-0 mt-0.5 text-[12px] text-text-muted">
                  {currentUser?.email ?? t('topbar.noEmail')}
                </p>
              </div>

              <div className="mt-1 grid gap-1">
                <button
                  type="button"
                  className="inline-flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-text-secondary transition duration-fast hover:bg-surface-subtle hover:text-text-primary"
                  role="menuitem"
                  onClick={handleOpenProfile}
                >
                  <AppIcon name="profile" className="h-4 w-4" aria-hidden="true" />
                  {t('topbar.profile')}
                </button>

                <button
                  type="button"
                  className="inline-flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-danger transition duration-fast hover:bg-danger-bg"
                  role="menuitem"
                  onClick={handleLogout}
                >
                  <AppIcon name="log-out" className="h-4 w-4" aria-hidden="true" />
                  {t('topbar.logout')}
                </button>
              </div>

              <div className="mt-1 border-t border-border-soft/60 pt-1">
                <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                  {t('common.language')}
                </p>
                <div className="grid gap-1">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      className={[
                        'inline-flex min-h-9 w-full items-center justify-between rounded-lg px-3 text-left text-sm font-medium transition duration-fast',
                        i18n.language === lang
                          ? 'bg-primary/12 text-text-primary'
                          : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary',
                      ].join(' ')}
                      onClick={() => {
                        void i18n.changeLanguage(lang);
                        setIsProfileMenuOpen(false);
                      }}
                    >
                      <span>{t(`common.languages.${lang}`)}</span>
                      {i18n.language === lang ? (
                        <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="sr-only">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}

export default AppTopbar;
