import { Suspense, type ComponentType, type JSX } from 'react';
import { Navigate, Outlet, createBrowserRouter, useLocation } from 'react-router-dom';
import type { AppRouteConfig, AppRouteId } from '../../config/routes';
import { fallbackRoutes, moduleRoutes, publicRoutes, routePaths } from '../../config/routes';
import RouteGate from './RouteGate';
import { useAuth } from '../../auth';
import { getAccessToken } from '../../lib/auth-storage';
import AppShell from '../../layout/AppShell';
import RouteErrorBoundary from './RouteErrorBoundary';
import { lazyRoute } from './lazy-route';

type RoutedPageId = Exclude<AppRouteId, 'home'>;

const pageRegistry: Record<RoutedPageId, ComponentType> = {
  'access-denied': lazyRoute(
    () => import('../pages/public/AccessDeniedPage'),
    'access-denied',
  ),
  'ai-settings': lazyRoute(() => import('../pages/protected/AiSettingsPage'), 'ai-settings'),
  agents: lazyRoute(() => import('../pages/protected/AgentsPage'), 'agents'),
  chat: lazyRoute(() => import('../pages/protected/ChatPage'), 'chat'),
  couriers: lazyRoute(() => import('../pages/protected/CouriersPage'), 'couriers'),
  customers: lazyRoute(() => import('../pages/protected/CustomersPage'), 'customers'),
  dashboard: lazyRoute(() => import('../pages/protected/DashboardPage'), 'dashboard'),
  integrations: lazyRoute(
    () => import('../pages/protected/IntegrationsPage'),
    'integrations',
  ),
  leads: lazyRoute(() => import('../pages/protected/LeadsPage'), 'leads'),
  login: lazyRoute(() => import('../pages/public/LoginPage'), 'login'),
  logs: lazyRoute(() => import('../pages/protected/LogsPage'), 'logs'),
  'not-found': lazyRoute(() => import('../pages/public/NotFoundPage'), 'not-found'),
  notifications: lazyRoute(
    () => import('../pages/protected/NotificationsPage'),
    'notifications',
  ),
  orders: lazyRoute(() => import('../pages/protected/OrdersPage'), 'orders'),
  payments: lazyRoute(() => import('../pages/protected/PaymentsPage'), 'payments'),
  products: lazyRoute(() => import('../pages/protected/ProductsPage'), 'products'),
  profile: lazyRoute(() => import('../pages/protected/ProfilePage'), 'profile'),
  users: lazyRoute(() => import('../pages/protected/UsersPage'), 'users'),
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
    errorElement: <RouteErrorBoundary />,
  },
  ...publicRoutes
    .filter((route) => route.id !== 'home')
    .map((route) => ({
      path: route.path,
      element: renderRouteElement(route),
      errorElement: <RouteErrorBoundary />,
    })),
  {
    element: <ProtectedShellRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <AppShell />,
        errorElement: <RouteErrorBoundary />,
        children: moduleRoutes.map((route) => ({
          path: route.path,
          element: renderRouteElement(route),
          errorElement: <RouteErrorBoundary />,
        })),
      },
    ],
  },
  ...fallbackRoutes.map((route) => ({
    path: route.path,
    element: renderRouteElement(route),
    errorElement: <RouteErrorBoundary />,
  })),
]);

