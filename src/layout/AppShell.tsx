import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { getRouteByPathname } from '../config/routes';
import AppSidebar from './AppSidebar';
import AppTopbar from './AppTopbar';

function AppShell() {
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
    <div className="relative flex min-h-screen bg-transparent">
      <div
        className={[
          'fixed inset-0 z-20 bg-background-overlay transition-opacity duration-base min-[960px]:hidden',
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

      <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-x-hidden bg-background-subtle">
        <AppTopbar
          title={currentRoute?.title ?? 'Chikko'}
          subtitle={
            currentRoute?.description ??
            'Shared application shell for internal routes.'
          }
          onMenuToggle={() => setIsSidebarOpen((open) => !open)}
        />

        <div className="flex-1 px-3 pb-4 pt-4 min-[640px]:px-4 min-[640px]:pb-5 min-[640px]:pt-5 min-[960px]:px-7 min-[960px]:pb-8 min-[960px]:pt-6">
          <div className="mx-auto w-full max-w-page min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppShell;
