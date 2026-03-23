import { NavLink } from 'react-router-dom';
import { navigationGroups, type NavigationIconKey } from '../config/navigation';
import AppIcon from '../components/shared/icons/AppIcon';

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigationItemMeta: Record<
  NavigationIconKey,
  { caption: string; label?: string }
> = {
  dashboard: { caption: 'Overview' },
  profile: { caption: 'Account', label: 'Profile' },
  leads: { caption: 'Pipeline' },
  customers: { caption: 'Accounts' },
  products: { caption: 'Catalog' },
  orders: { caption: 'Fulfillment' },
  payments: { caption: 'Transactions' },
  chat: { caption: 'Inbox' },
  notifications: { caption: 'Alerts', label: 'Alerts' },
  'ai-settings': { caption: 'Workspace', label: 'AI Studio' },
  logs: { caption: 'Audit', label: 'Audit Log' },
};

const closeButtonClassName = [
  'inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border-soft bg-background-elevated/80 text-text-secondary transition',
  'duration-fast hover:border-border-accent hover:bg-primary/10 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-0',
  'min-[960px]:hidden',
].join(' ');

const groupLabelClassName =
  'mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted';

const navLinkBaseClassName = [
  'group block rounded-xl border px-3 py-2.5 text-text-secondary no-underline transition duration-fast',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-0',
].join(' ');

const navLinkInactiveClassName = [
  'border-transparent hover:border-border-soft hover:bg-background-subtle hover:text-text-primary',
].join(' ');

const navLinkActiveClassName = [
  'border-border-accent bg-primary/10 text-text-primary shadow-sm',
].join(' ');

function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  return (
    <aside
      className={[
        'fixed inset-y-0 left-0 z-30 flex w-[84vw] max-w-sidebar flex-col border-r border-border-soft',
        'bg-surface-card px-3 pb-3 pt-4 text-text-primary shadow-md transition-transform duration-base',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        'min-[960px]:sticky min-[960px]:top-0 min-[960px]:h-screen min-[960px]:w-sidebar min-[960px]:max-w-none min-[960px]:shrink-0 min-[960px]:translate-x-0',
      ].join(' ')}
    >
      <div className="flex min-h-topbar items-center justify-between gap-3 border-b border-border-soft/90 py-4">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted">
            Chikko CRM
          </p>
          <h1 className="m-0 text-[1.35rem] font-bold tracking-[-0.03em]">
            Chikko
          </h1>
        </div>
        <button
          type="button"
          className={closeButtonClassName}
          onClick={onClose}
          aria-label="Close navigation"
        >
          <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 pt-4">
        {navigationGroups.map((group) => (
          <section
            key={group.id}
            className="mt-0 first:mt-0 [&+&]:mt-5"
          >
            <p className={groupLabelClassName}>{group.label}</p>
            <nav
              aria-label={`${group.label} navigation`}
              className="grid gap-1.5"
            >
              {group.items.map((item) => (
                <NavLink
                  key={item.id}
                  to={item.path}
                  end
                  className={({ isActive }) =>
                    [
                      navLinkBaseClassName,
                      isActive
                        ? navLinkActiveClassName
                        : navLinkInactiveClassName,
                    ].join(' ')
                  }
                >
                  {({ isActive }) => (
                    <span className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className={[
                          'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border transition duration-fast',
                          isActive
                            ? 'border-border-accent bg-primary/10 text-primary'
                            : 'border-border-soft bg-background-subtle text-text-secondary group-hover:border-border-accent group-hover:bg-primary/10 group-hover:text-text-primary',
                        ].join(' ')}
                      >
                        <AppIcon
                          name={item.iconKey}
                          className="h-[17px] w-[17px]"
                        />
                      </span>
                      <span className="grid min-w-0 gap-[3px]">
                        <span className="font-semibold [overflow-wrap:anywhere]">
                          {navigationItemMeta[item.iconKey].label ?? item.label}
                        </span>
                        <small className="text-[11px] tracking-[0.02em] text-text-muted [overflow-wrap:anywhere]">
                          {navigationItemMeta[item.iconKey].caption}
                        </small>
                      </span>
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </section>
        ))}
      </div>
    </aside>
  );
}

export default AppSidebar;
