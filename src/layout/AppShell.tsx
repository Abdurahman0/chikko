import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getRouteByPathname } from '../config/routes';
import AppSidebar from './AppSidebar';
import AppTopbar from './AppTopbar';

function AppShell() {
  const { t } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const currentRoute = useMemo(
    () => getRouteByPathname(location.pathname),
    [location.pathname],
  );

  return (
    <div className="relative flex h-dvh w-full overflow-hidden bg-background-default">
      <div
        className={[
          'fixed inset-0 z-40 bg-background-overlay transition-opacity duration-base min-[960px]:hidden',
          isSidebarOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0',
        ].join(' ')}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden={!isSidebarOpen}
      />

      <AppSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex h-dvh min-w-0 w-full flex-1 flex-col overflow-hidden bg-background-default">
        <AppTopbar
          title={
            currentRoute
              ? t(`routes.${currentRoute.id}.title`, { defaultValue: currentRoute.title })
              : t('common.appName')
          }
          subtitle={
            currentRoute
              ? t(`routes.${currentRoute.id}.description`, {
                  defaultValue: currentRoute.description,
                })
              : ''
          }
          onMenuToggle={() => setIsSidebarOpen((open) => !open)}
        />

        <main className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-3 pb-5 pt-3 min-[640px]:px-4 min-[640px]:pb-6 min-[640px]:pt-4 min-[960px]:px-7 min-[960px]:pb-8 min-[960px]:pt-4">
          <div className="mx-auto w-full max-w-page min-w-0">
            <Outlet />
          </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppShell;
