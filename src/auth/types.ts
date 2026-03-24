import type { AppRole } from '../types/architecture';
import type { AppUser } from '../types/domain';

export const PERMISSION_CODES = [
  'can_chat',
  'can_manage_customers',
  'can_manage_products',
  'can_manage_integrations',
  'can_manage_ai_settings',
  'can_manage_leads',
  'can_manage_payments',
  'can_manage_users',
  'can_update_orders',
  'can_view_customers',
  'can_view_dashboard',
  'can_view_leads',
  'can_view_logs',
  'can_view_notifications',
  'can_view_orders',
  'can_view_payments',
  'can_view_products',
] as const;

export type PermissionCode = (typeof PERMISSION_CODES)[number];

export interface AuthenticatedUser extends Omit<AppUser, 'permissionKeys' | 'role'> {
  role: AppRole;
  permissionKeys: PermissionCode[];
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  issuedAt: string;
  expiresAt: string;
  user: AuthenticatedUser;
}

export interface LoginInput {
  email: string;
  password: string;
}
