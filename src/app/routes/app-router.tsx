import type { ComponentType, JSX } from 'react';
import { Navigate, Outlet, createBrowserRouter, useLocation } from 'react-router-dom';
import type { AppRouteConfig, AppRouteId } from '../../config/routes';
import { fallbackRoutes, moduleRoutes, publicRoutes, routePaths } from '../../config/routes';
import RouteGate from './RouteGate';
import { useAuth } from '../../auth';
import { getAccessToken } from '../../lib/auth-storage';
import AccessDeniedPage from '../pages/public/AccessDeniedPage';
import AiSettingsPage from '../pages/protected/AiSettingsPage';
import ChatPage from '../pages/protected/ChatPage';
import CustomersPage from '../pages/protected/CustomersPage';
import DashboardPage from '../pages/protected/DashboardPage';
import LeadsPage from '../pages/protected/LeadsPage';
import LoginPage from '../pages/public/LoginPage';
import LogsPage from '../pages/protected/LogsPage';
import NotFoundPage from '../pages/public/NotFoundPage';
import NotificationsPage from '../pages/protected/NotificationsPage';
import OrdersPage from '../pages/protected/OrdersPage';
import PaymentsPage from '../pages/protected/PaymentsPage';
import ProductsPage from '../pages/protected/ProductsPage';
import ProfilePage from '../pages/protected/ProfilePage';
import UsersPage from '../pages/protected/UsersPage';
import IntegrationsPage from '../pages/protected/IntegrationsPage';
import AppShell from '../../layout/AppShell';

type RoutedPageId = Exclude<AppRouteId, 'home'>;

const pageRegistry: Record<RoutedPageId, ComponentType> = {
  'access-denied': AccessDeniedPage,
  'ai-settings': AiSettingsPage,
  chat: ChatPage,
  customers: CustomersPage,
  dashboard: DashboardPage,
  integrations: IntegrationsPage,
  leads: LeadsPage,
  login: LoginPage,
  logs: LogsPage,
  'not-found': NotFoundPage,
  notifications: NotificationsPage,
  orders: OrdersPage,
  payments: PaymentsPage,
  products: ProductsPage,
  profile: ProfilePage,
  users: UsersPage,
};

function renderRouteElement(route: AppRouteConfig): JSX.Element {
  if (route.id === 'home') {
    return <Navigate replace to={routePaths.dashboard} />;
  }

  const PageComponent = pageRegistry[route.id];

  return (
    <RouteGate route={route}>
      <PageComponent />
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

