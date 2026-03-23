import { routePaths } from '../config/routes';
import type { AppRouteId } from '../config/routes';
import type { AppRole } from '../types/architecture';
import type { AuthenticatedUser, PermissionCode } from './types';

const OPERATOR_ROUTE_PERMISSIONS: Partial<Record<AppRouteId, PermissionCode>> = {
  dashboard: 'can_view_dashboard',
  leads: 'can_view_leads',
  customers: 'can_view_customers',
  products: 'can_view_products',
  orders: 'can_view_orders',
  payments: 'can_view_payments',
  chat: 'can_chat',
  notifications: 'can_view_notifications',
  users: 'can_manage_users',
  integrations: 'can_manage_integrations',
};

const ADMIN_ALLOWED_ROUTES = new Set<AppRouteId>([
  'dashboard',
  'leads',
  'customers',
  'products',
  'orders',
  'payments',
  'chat',
  'notifications',
  'profile',
]);

const PUBLIC_ROUTE_IDS = new Set<AppRouteId>([
  'home',
  'login',
  'access-denied',
  'not-found',
]);

const MODULE_PATH_BY_ROUTE_ID: Record<string, string> = {
  dashboard: routePaths.dashboard,
  leads: routePaths.leads,
  customers: routePaths.customers,
  products: routePaths.products,
  orders: routePaths.orders,
  payments: routePaths.payments,
  chat: routePaths.chat,
  notifications: routePaths.notifications,
  profile: routePaths.profile,
  users: routePaths.users,
  integrations: routePaths.integrations,
  'ai-settings': routePaths['ai-settings'],
  logs: routePaths.logs,
};

export function hasRole(
  user: AuthenticatedUser | null,
  role: AppRole | readonly AppRole[],
): boolean {
  if (!user) {
    return false;
  }

  if (Array.isArray(role)) {
    return role.includes(user.role);
  }

  return user.role === role;
}

export function hasPermission(
  user: AuthenticatedUser | null,
  permission: PermissionCode,
): boolean {
  if (!user) {
    return false;
  }

  if (user.role === 'developer') {
    return true;
  }

  return user.permissionKeys.includes(permission);
}

export function canAccessRouteForUser(
  user: AuthenticatedUser | null,
  routeId: AppRouteId,
): boolean {
  if (PUBLIC_ROUTE_IDS.has(routeId)) {
    return true;
  }

  if (!user) {
    return false;
  }

  if (user.role === 'developer') {
    return true;
  }

  if (routeId === 'profile') {
    return true;
  }

  if (user.role === 'admin') {
    return ADMIN_ALLOWED_ROUTES.has(routeId);
  }

  const requiredPermission = OPERATOR_ROUTE_PERMISSIONS[routeId];
  if (!requiredPermission) {
    return false;
  }

  return hasPermission(user, requiredPermission);
}

export function resolveDefaultLandingPathForUser(
  user: AuthenticatedUser | null,
): string {
  if (!user) {
    return routePaths.login;
  }

  if (user.role === 'developer' || user.role === 'admin') {
    return routePaths.dashboard;
  }

  if (
    hasPermission(user, 'can_view_payments') &&
    !hasPermission(user, 'can_view_leads')
  ) {
    return routePaths.payments;
  }

  if (hasPermission(user, 'can_view_leads')) {
    return routePaths.leads;
  }

  if (hasPermission(user, 'can_view_dashboard')) {
    return routePaths.dashboard;
  }

  const fallbackRouteOrder: AppRouteId[] = [
    'orders',
    'customers',
    'chat',
    'profile',
  ];

  const firstAllowed = fallbackRouteOrder.find((routeId) =>
    canAccessRouteForUser(user, routeId),
  );

  if (!firstAllowed) {
    return routePaths.accessDenied;
  }

  return MODULE_PATH_BY_ROUTE_ID[firstAllowed] ?? routePaths.accessDenied;
}
