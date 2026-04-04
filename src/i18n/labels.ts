import type { TFunction } from 'i18next';
import type { LeadStatus, UserRole, UserStatus } from '../types/domain';

const LEAD_STATUS_KEYS: Record<LeadStatus, string> = {
  new: 'labels.leadStatus.new',
  contacted: 'labels.leadStatus.contacted',
  qualified: 'labels.leadStatus.qualified',
  negotiating: 'labels.leadStatus.negotiating',
  converted: 'labels.leadStatus.converted',
  lost: 'labels.leadStatus.lost',
};

const CHANNEL_KEYS: Record<string, string> = {
  instagram: 'labels.channels.instagram',
  telegram: 'labels.channels.telegram',
  whatsapp: 'labels.channels.whatsapp',
  facebook: 'labels.channels.facebook',
  website: 'labels.channels.website',
  marketplace: 'labels.channels.marketplace',
  webchat: 'labels.channels.webchat',
  web: 'labels.channels.web',
  referral: 'labels.channels.referral',
  manual: 'labels.channels.manual',
  other: 'labels.channels.other',
};

const ORDER_STATUS_KEYS: Record<string, string> = {
  draft: 'labels.orderStatus.draft',
  waiting_payment: 'labels.orderStatus.waiting_payment',
  pending: 'labels.orderStatus.pending',
  confirmed: 'labels.orderStatus.confirmed',
  paid: 'labels.orderStatus.paid',
  completed: 'labels.orderStatus.completed',
  cancelled: 'labels.orderStatus.cancelled',
};

const PAYMENT_STATUS_KEYS: Record<string, string> = {
  unpaid: 'labels.paymentStatus.unpaid',
  pending: 'labels.paymentStatus.pending',
  paid: 'labels.paymentStatus.paid',
  approved: 'labels.paymentStatus.approved',
  rejected: 'labels.paymentStatus.rejected',
  verified: 'labels.paymentStatus.verified',
  failed: 'labels.paymentStatus.failed',
  refunded: 'labels.paymentStatus.refunded',
  'partially-refunded': 'labels.paymentStatus.partially_refunded',
};

const PAYMENT_METHOD_KEYS: Record<string, string> = {
  manual: 'labels.paymentMethod.manual',
  payme: 'labels.paymentMethod.payme',
  click: 'labels.paymentMethod.click',
};

const USER_ROLE_KEYS: Record<UserRole, string> = {
  developer: 'labels.roles.developer',
  admin: 'labels.roles.admin',
  operator: 'labels.roles.operator',
};

const USER_STATUS_KEYS: Record<UserStatus, string> = {
  active: 'labels.userStatus.active',
  inactive: 'labels.userStatus.inactive',
  invited: 'labels.userStatus.invited',
};

const USER_PERMISSION_LABEL_KEYS: Record<string, string> = {
  can_view_dashboard: 'labels.permissions.can_view_dashboard',
  can_view_agents: 'labels.permissions.can_view_agents',
  can_manage_agents: 'labels.permissions.can_manage_agents',
  can_view_couriers: 'labels.permissions.can_view_couriers',
  can_manage_couriers: 'labels.permissions.can_manage_couriers',
  can_view_leads: 'labels.permissions.can_view_leads',
  can_manage_leads: 'labels.permissions.can_manage_leads',
  can_view_customers: 'labels.permissions.can_view_customers',
  can_manage_customers: 'labels.permissions.can_manage_customers',
  can_view_products: 'labels.permissions.can_view_products',
  can_manage_products: 'labels.permissions.can_manage_products',
  can_view_orders: 'labels.permissions.can_view_orders',
  can_update_orders: 'labels.permissions.can_update_orders',
  can_view_payments: 'labels.permissions.can_view_payments',
  can_manage_payments: 'labels.permissions.can_manage_payments',
  can_chat: 'labels.permissions.can_chat',
  can_view_notifications: 'labels.permissions.can_view_notifications',
  can_manage_users: 'labels.permissions.can_manage_users',
  can_manage_integrations: 'labels.permissions.can_manage_integrations',
  can_manage_ai_settings: 'labels.permissions.can_manage_ai_settings',
  can_view_logs: 'labels.permissions.can_view_logs',
};

const USER_PERMISSION_DESCRIPTION_KEYS: Record<string, string> = {
  can_view_dashboard: 'labels.permissionDescriptions.can_view_dashboard',
  can_view_agents: 'labels.permissionDescriptions.can_view_agents',
  can_manage_agents: 'labels.permissionDescriptions.can_manage_agents',
  can_view_couriers: 'labels.permissionDescriptions.can_view_couriers',
  can_manage_couriers: 'labels.permissionDescriptions.can_manage_couriers',
  can_view_leads: 'labels.permissionDescriptions.can_view_leads',
  can_manage_leads: 'labels.permissionDescriptions.can_manage_leads',
  can_view_customers: 'labels.permissionDescriptions.can_view_customers',
  can_manage_customers: 'labels.permissionDescriptions.can_manage_customers',
  can_view_products: 'labels.permissionDescriptions.can_view_products',
  can_manage_products: 'labels.permissionDescriptions.can_manage_products',
  can_view_orders: 'labels.permissionDescriptions.can_view_orders',
  can_update_orders: 'labels.permissionDescriptions.can_update_orders',
  can_view_payments: 'labels.permissionDescriptions.can_view_payments',
  can_manage_payments: 'labels.permissionDescriptions.can_manage_payments',
  can_chat: 'labels.permissionDescriptions.can_chat',
  can_view_notifications: 'labels.permissionDescriptions.can_view_notifications',
  can_manage_users: 'labels.permissionDescriptions.can_manage_users',
  can_manage_integrations: 'labels.permissionDescriptions.can_manage_integrations',
  can_manage_ai_settings: 'labels.permissionDescriptions.can_manage_ai_settings',
  can_view_logs: 'labels.permissionDescriptions.can_view_logs',
};

function resolveLabel(
  t: TFunction,
  dictionary: Record<string, string>,
  key: string,
  fallback?: string,
): string {
  const translationKey = dictionary[key];
  if (!translationKey) {
    return fallback ?? key;
  }

  return t(translationKey, { defaultValue: fallback ?? key });
}

export function getLeadStatusLabel(
  t: TFunction,
  status: LeadStatus,
  fallback?: string,
): string {
  return resolveLabel(t, LEAD_STATUS_KEYS, status, fallback);
}

export function getChannelLabel(
  t: TFunction,
  channel: string,
  fallback?: string,
): string {
  return resolveLabel(t, CHANNEL_KEYS, channel, fallback);
}

export function getOrderStatusLabel(
  t: TFunction,
  status: string,
  fallback?: string,
): string {
  return resolveLabel(t, ORDER_STATUS_KEYS, status, fallback);
}

export function getPaymentStatusLabel(
  t: TFunction,
  status: string,
  fallback?: string,
): string {
  return resolveLabel(t, PAYMENT_STATUS_KEYS, status, fallback);
}

export function getPaymentMethodLabel(
  t: TFunction,
  method: string,
  fallback?: string,
): string {
  return resolveLabel(t, PAYMENT_METHOD_KEYS, method, fallback);
}

export function getUserRoleLabel(t: TFunction, role: UserRole): string {
  return t(USER_ROLE_KEYS[role], { defaultValue: role });
}

export function getUserStatusLabel(
  t: TFunction,
  status?: UserStatus,
): string {
  if (!status) {
    return t('labels.userStatus.active');
  }

  return t(USER_STATUS_KEYS[status], { defaultValue: status });
}

export function getUserPermissionLabel(
  t: TFunction,
  permissionCode: string,
  fallback?: string,
): string {
  return resolveLabel(t, USER_PERMISSION_LABEL_KEYS, permissionCode, fallback);
}

export function getUserPermissionDescription(
  t: TFunction,
  permissionCode: string,
  fallback?: string,
): string {
  return resolveLabel(
    t,
    USER_PERMISSION_DESCRIPTION_KEYS,
    permissionCode,
    fallback,
  );
}
