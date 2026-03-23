import { useEffect, useState } from 'react';
import AppIcon from '../components/shared/icons/AppIcon';

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
  'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border-soft bg-background-elevated/90 text-text-primary transition',
  'duration-fast hover:border-border-accent hover:bg-surface-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-0',
  'min-[960px]:hidden',
].join(' ');

const topbarIconButtonClassName = [
  'hidden h-10 w-10 items-center justify-center rounded-full border border-border-soft bg-background-elevated/90 text-text-secondary transition duration-fast',
  'hover:border-border-accent hover:bg-surface-card hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 min-[960px]:inline-flex',
].join(' ');

function AppTopbar({ title, subtitle, onMenuToggle }: AppTopbarProps) {
  const [isDarkTheme, setIsDarkTheme] = useState(getInitialIsDarkTheme);

  useEffect(() => {
    const nextTheme = isDarkTheme ? 'dark' : 'light';

    document.documentElement.dataset.theme = nextTheme;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Ignore storage failures and keep the in-memory toggle working.
    }
  }, [isDarkTheme]);

  return (
    <header className="sticky top-0 z-10 flex min-h-topbar items-center justify-between gap-3 border-b border-border-soft/90 bg-background-elevated/88 px-5 py-4 shadow-sm backdrop-blur-shell max-[640px]:flex-wrap max-[640px]:items-start min-[960px]:px-7">
      <div className="flex min-w-0 items-center gap-3 max-[640px]:items-start">
        <button
          type="button"
          className={menuToggleClassName}
          onClick={onMenuToggle}
          aria-label="Open navigation"
        >
          <AppIcon name="menu" className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            Workspace
          </p>
          <h2 className="m-0 text-[clamp(1.2rem,2.5vw,1.6rem)] font-bold leading-[1.05] tracking-[-0.03em] text-text-primary [overflow-wrap:anywhere]">
            {title}
          </h2>
          <p className="mt-1 max-w-[52ch] text-sm text-text-muted [overflow-wrap:anywhere]">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 text-text-muted max-[640px]:ml-auto">
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-border-soft bg-background-elevated/90 px-3.5 text-sm font-semibold text-text-secondary transition duration-fast hover:border-border-accent hover:bg-surface-card hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          onClick={() => setIsDarkTheme((current) => !current)}
          aria-pressed={isDarkTheme}
          aria-label="Toggle theme"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
            <AppIcon
              name={isDarkTheme ? 'moon' : 'sun'}
              className="h-4.5 w-4.5"
              aria-hidden="true"
            />
          </span>
          <span className="hidden min-[960px]:inline">
            {isDarkTheme ? 'Dark' : 'Light'}
          </span>
        </button>

        <button
          type="button"
          className={topbarIconButtonClassName}
          aria-label="Search"
        >
          <AppIcon name="search" className="h-5 w-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          className={topbarIconButtonClassName}
          aria-label="Notifications"
        >
          <AppIcon name="bell" className="h-5 w-5" aria-hidden="true" />
        </button>

        <span className="hidden h-10 items-center gap-3 rounded-full border border-border-soft bg-background-elevated/90 px-3.5 transition duration-fast hover:border-border-accent hover:bg-surface-card min-[960px]:inline-flex">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
            <AppIcon name="user" className="h-[17px] w-[17px]" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold text-text-primary">Admin</span>
        </span>
      </div>
    </header>
  );
}

export default AppTopbar;
