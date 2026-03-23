import type { TFunction } from 'i18next';
import type { LeadStatus, UserRole, UserStatus } from '../types/domain';

const LEAD_STATUS_KEYS: Record<LeadStatus, string> = {
  new: 'labels.leadStatus.new',
  contacted: 'labels.leadStatus.contacted',
  qualified: 'labels.leadStatus.qualified',
  negotiating: 'labels.leadStatus.negotiating',
  converted: 'labels.leadStatus.converted',
  lost: 'labels.leadStatus.lost',
  archived: 'labels.leadStatus.archived',
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
