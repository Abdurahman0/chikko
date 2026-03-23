import type { AuthenticatedUser, PermissionCode } from './types';
import { PERMISSION_CODES } from './types';

export const DEMO_ACCOUNT_PASSWORD = 'Password123!';

const NOW_ISO = new Date().toISOString();
const FULL_ACCESS_PERMISSIONS: PermissionCode[] = [...PERMISSION_CODES];

const ADMIN_PERMISSIONS: PermissionCode[] = [
  'can_chat',
  'can_manage_customers',
  'can_manage_leads',
  'can_manage_payments',
  'can_update_orders',
  'can_view_customers',
  'can_view_dashboard',
  'can_view_leads',
  'can_view_notifications',
  'can_view_orders',
  'can_view_payments',
  'can_view_products',
];

const OPERATOR_SALES_PERMISSIONS: PermissionCode[] = [
  'can_chat',
  'can_manage_customers',
  'can_manage_leads',
  'can_update_orders',
  'can_view_customers',
  'can_view_dashboard',
  'can_view_leads',
  'can_view_orders',
  'can_view_products',
];

const OPERATOR_PAYMENTS_PERMISSIONS: PermissionCode[] = [
  'can_chat',
  'can_manage_payments',
  'can_view_customers',
  'can_view_dashboard',
  'can_view_orders',
  'can_view_payments',
];

export interface DemoAuthAccount {
  email: string;
  password: string;
  user: AuthenticatedUser;
}

export const DEMO_AUTH_ACCOUNTS: readonly DemoAuthAccount[] = [
  {
    email: 'developer@example.com',
    password: DEMO_ACCOUNT_PASSWORD,
    user: {
      id: 'auth-user-developer',
      fullName: 'Developer User',
      email: 'developer@example.com',
      phone: '+998 90 100 1001',
      role: 'developer',
      status: 'active',
      avatarUrl: '/mock/avatars/user-1.png',
      permissionKeys: FULL_ACCESS_PERMISSIONS,
      createdAt: NOW_ISO,
      updatedAt: NOW_ISO,
    },
  },
  {
    email: 'admin@example.com',
    password: DEMO_ACCOUNT_PASSWORD,
    user: {
      id: 'auth-user-admin',
      fullName: 'Admin User',
      email: 'admin@example.com',
      phone: '+998 90 100 1002',
      role: 'admin',
      status: 'active',
      avatarUrl: '/mock/avatars/user-2.png',
      permissionKeys: ADMIN_PERMISSIONS,
      createdAt: NOW_ISO,
      updatedAt: NOW_ISO,
    },
  },
  {
    email: 'operator.sales@example.com',
    password: DEMO_ACCOUNT_PASSWORD,
    user: {
      id: 'auth-user-operator-sales',
      fullName: 'Operator Sales',
      email: 'operator.sales@example.com',
      phone: '+998 90 100 1003',
      role: 'operator',
      status: 'active',
      avatarUrl: '/mock/avatars/user-3.png',
      permissionKeys: OPERATOR_SALES_PERMISSIONS,
      createdAt: NOW_ISO,
      updatedAt: NOW_ISO,
    },
  },
  {
    email: 'operator.payments@example.com',
    password: DEMO_ACCOUNT_PASSWORD,
    user: {
      id: 'auth-user-operator-payments',
      fullName: 'Operator Payments',
      email: 'operator.payments@example.com',
      phone: '+998 90 100 1004',
      role: 'operator',
      status: 'active',
      avatarUrl: '/mock/avatars/user-4.png',
      permissionKeys: OPERATOR_PAYMENTS_PERMISSIONS,
      createdAt: NOW_ISO,
      updatedAt: NOW_ISO,
    },
  },
];
