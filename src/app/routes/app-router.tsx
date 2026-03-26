import { lazy, Suspense, type ComponentType, type JSX } from 'react';
import { Navigate, Outlet, createBrowserRouter, useLocation } from 'react-router-dom';
import type { AppRouteConfig, AppRouteId } from '../../config/routes';
import { fallbackRoutes, moduleRoutes, publicRoutes, routePaths } from '../../config/routes';
import RouteGate from './RouteGate';
import { useAuth } from '../../auth';
import { getAccessToken } from '../../lib/auth-storage';
import AppShell from '../../layout/AppShell';

type RoutedPageId = Exclude<AppRouteId, 'home'>;

const pageRegistry: Record<RoutedPageId, ComponentType> = {
  'access-denied': lazy(() => import('../pages/public/AccessDeniedPage')),
  'ai-settings': lazy(() => import('../pages/protected/AiSettingsPage')),
  chat: lazy(() => import('../pages/protected/ChatPage')),
  customers: lazy(() => import('../pages/protected/CustomersPage')),
  dashboard: lazy(() => import('../pages/protected/DashboardPage')),
  integrations: lazy(() => import('../pages/protected/IntegrationsPage')),
  leads: lazy(() => import('../pages/protected/LeadsPage')),
  login: lazy(() => import('../pages/public/LoginPage')),
  logs: lazy(() => import('../pages/protected/LogsPage')),
  'not-found': lazy(() => import('../pages/public/NotFoundPage')),
  notifications: lazy(() => import('../pages/protected/NotificationsPage')),
  orders: lazy(() => import('../pages/protected/OrdersPage')),
  payments: lazy(() => import('../pages/protected/PaymentsPage')),
  products: lazy(() => import('../pages/protected/ProductsPage')),
  profile: lazy(() => import('../pages/protected/ProfilePage')),
  users: lazy(() => import('../pages/protected/UsersPage')),
};

function RouteLoadingFallback(): JSX.Element {
  return (
    <main className="grid min-h-screen place-items-center bg-background-default p-6">
      <p className="text-sm font-semibold text-text-secondary">Loading...</p>
    </main>
  );
}

function renderRouteElement(route: AppRouteConfig): JSX.Element {
  if (route.id === 'home') {
    return <Navigate replace to={routePaths.dashboard} />;
  }

  const PageComponent = pageRegistry[route.id];

  return (
    <RouteGate route={route}>
      <Suspense fallback={<RouteLoadingFallback />}>
        <PageComponent />
      </Suspense>
    </RouteGate>
  );
}

function ProtectedShellRoute(): JSX.Element {
  const location = useLocation();
  const { isAuthenticated, isBootstrapping } = useAuth();
  const hasAccessToken = Boolean(getAccessToken());

  if (isBootstrapping) {
    return (
      <main className="grid min-h-screen place-items-center bg-background-default p-6">
        <p className="text-sm font-semibold text-text-secondary">Loading session...</p>
      </main>
    );
  }

  if (!hasAccessToken || !isAuthenticated) {
    return (
      <Navigate
        replace
        to={routePaths.login}
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
}

export const appRouter = createBrowserRouter([
  {
    path: routePaths.root,
    element: <Navigate replace to={routePaths.dashboard} />,
  },
  ...publicRoutes
    .filter((route) => route.id !== 'home')
    .map((route) => ({
      path: route.path,
      element: renderRouteElement(route),
    })),
  {
    element: <ProtectedShellRoute />,
    children: [
      {
        element: <AppShell />,
        children: moduleRoutes.map((route) => ({
          path: route.path,
          element: renderRouteElement(route),
        })),
      },
    ],
  },
  ...fallbackRoutes.map((route) => ({
    path: route.path,
    element: renderRouteElement(route),
  })),
]);

