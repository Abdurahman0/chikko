import type { AppModule, AppRole, AccessStrategy } from '../types/architecture';
import type { AppRouteId } from './routes';
import { getRouteById } from './routes';

export type NavigationGroupId =
  | 'main'
  | 'operations'
  | 'communication'
  | 'system';

export type NavigationIconKey =
  | 'dashboard'
  | 'profile'
  | 'users'
  | 'integrations'
  | 'leads'
  | 'customers'
  | 'products'
  | 'orders'
  | 'couriers'
  | 'payments'
  | 'chat'
  | 'notifications'
  | 'ai-settings'
  | 'logs';

type SidebarRouteId = Extract<AppRouteId, AppModule['id']>;

interface NavigationItemBlueprint {
  routeId: SidebarRouteId;
  group: NavigationGroupId;
  sortOrder: number;
  iconKey: NavigationIconKey;
  permissionKey?: string;
  visibilityNote?: string;
}

export interface NavigationItemConfig {
  id: SidebarRouteId;
  label: string;
  path: string;
  iconKey: NavigationIconKey;
  moduleId?: AppModule['id'];
  group: NavigationGroupId;
  sortOrder: number;
  allowedRoles?: AppRole[];
  accessStrategy?: AccessStrategy;
  permissionKey?: string;
  visibilityNote?: string;
  children?: NavigationItemConfig[];
}

export interface NavigationGroupConfig {
  id: NavigationGroupId;
  label: string;
  sortOrder: number;
  items: NavigationItemConfig[];
}

const navigationGroupDefinitions = [
  {
    id: 'main',
    label: 'Workspace',
    sortOrder: 1,
  },
  {
    id: 'operations',
    label: 'Pipeline',
    sortOrder: 2,
  },
  {
    id: 'communication',
    label: 'Inbox',
    sortOrder: 3,
  },
  {
    id: 'system',
    label: 'Control',
    sortOrder: 4,
  },
] as const satisfies ReadonlyArray<
  Omit<NavigationGroupConfig, 'items'>
>;

const navigationBlueprints: NavigationItemBlueprint[] = [
  {
    routeId: 'dashboard',
    group: 'main',
    sortOrder: 1,
    iconKey: 'dashboard',
    permissionKey: 'can_view_dashboard',
    visibilityNote:
      'Shown broadly. Operator visibility should later remain backend-permission driven.',
  },
  {
    routeId: 'profile',
    group: 'main',
    sortOrder: 2,
    iconKey: 'profile',
    visibilityNote: 'Personal route intended for signed-in users.',
  },
  {
    routeId: 'leads',
    group: 'operations',
    sortOrder: 1,
    iconKey: 'leads',
    permissionKey: 'can_view_leads',
  },
  {
    routeId: 'customers',
    group: 'operations',
    sortOrder: 2,
    iconKey: 'customers',
    permissionKey: 'can_view_customers',
  },
  {
    routeId: 'products',
    group: 'operations',
    sortOrder: 3,
    iconKey: 'products',
    permissionKey: 'can_view_products',
  },
  {
    routeId: 'orders',
    group: 'operations',
    sortOrder: 4,
    iconKey: 'orders',
    permissionKey: 'can_view_orders',
  },
  {
    routeId: 'couriers',
    group: 'operations',
    sortOrder: 5,
    iconKey: 'couriers',
    permissionKey: 'can_view_orders',
  },
  {
    routeId: 'payments',
    group: 'operations',
    sortOrder: 6,
    iconKey: 'payments',
    permissionKey: 'can_view_payments',
  },
  {
    routeId: 'chat',
    group: 'communication',
    sortOrder: 1,
    iconKey: 'chat',
    permissionKey: 'can_chat',
  },
  {
    routeId: 'notifications',
    group: 'communication',
    sortOrder: 2,
    iconKey: 'notifications',
    permissionKey: 'can_view_notifications',
  },
  {
    routeId: 'users',
    group: 'system',
    sortOrder: 1,
    iconKey: 'users',
    permissionKey: 'can_manage_users',
  },
  {
    routeId: 'integrations',
    group: 'system',
    sortOrder: 2,
    iconKey: 'integrations',
    permissionKey: 'can_manage_integrations',
  },
  {
    routeId: 'ai-settings',
    group: 'system',
    sortOrder: 3,
    iconKey: 'ai-settings',
    visibilityNote:
      'Developer-focused module. Admin should not be treated as having developer-level visibility here.',
  },
  {
    routeId: 'logs',
    group: 'system',
    sortOrder: 4,
    iconKey: 'logs',
    visibilityNote:
      'Developer-focused module. Operator access, if ever allowed later, should be permission-driven.',
  },
];

export const navigationItems: NavigationItemConfig[] = navigationBlueprints
  .map((item) => {
    const route = getRouteById(item.routeId);

    return {
      id: item.routeId,
      label: route.title,
      path: route.path,
      iconKey: item.iconKey,
      moduleId: route.moduleId,
      group: item.group,
      sortOrder: item.sortOrder,
      allowedRoles: route.allowedRoles,
      accessStrategy: route.accessStrategy,
      permissionKey: item.permissionKey,
      visibilityNote: item.visibilityNote,
    };
  })
  .sort((left, right) => left.sortOrder - right.sortOrder);

export const navigationGroups: NavigationGroupConfig[] =
  navigationGroupDefinitions
    .map((group) => ({
      ...group,
      items: navigationItems.filter((item) => item.group === group.id),
    }))
    .filter((group) => group.items.length > 0)
    .sort((left, right) => left.sortOrder - right.sortOrder);
