import type { SelectOption } from '../types/common';
import type { LeadStatus } from '../types/lead';
import type { ProductStatus } from '../types/product';
import type { OrderStatus } from '../types/order';
import type { PaymentMethod, PaymentStatus } from '../types/payment';
import type {
  MessageDeliveryStatus,
  MessageSenderType,
} from '../types/chat';
import type {
  NotificationSeverity,
  NotificationType,
} from '../types/notification';
import type { UserStatus } from '../types/user';

export const LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'negotiating',
  'converted',
  'lost',
  'archived',
] as const satisfies readonly LeadStatus[];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  negotiating: 'Negotiating',
  converted: 'Converted',
  lost: 'Lost',
  archived: 'Archived',
};

export const LEAD_STATUS_OPTIONS: SelectOption[] = [
  { value: 'new', label: LEAD_STATUS_LABELS.new },
  { value: 'contacted', label: LEAD_STATUS_LABELS.contacted },
  { value: 'qualified', label: LEAD_STATUS_LABELS.qualified },
  { value: 'negotiating', label: LEAD_STATUS_LABELS.negotiating },
  { value: 'converted', label: LEAD_STATUS_LABELS.converted },
  { value: 'lost', label: LEAD_STATUS_LABELS.lost },
  { value: 'archived', label: LEAD_STATUS_LABELS.archived },
];

export const ORDER_STATUSES = [
  'draft',
  'waiting_payment',
  'pending',
  'confirmed',
  'paid',
  'completed',
  'cancelled',
] as const satisfies readonly OrderStatus[];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: 'Draft',
  waiting_payment: 'Waiting Payment',
  pending: 'Pending',
  confirmed: 'Confirmed',
  paid: 'Paid',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const ORDER_STATUS_OPTIONS: SelectOption[] = [
  { value: 'draft', label: ORDER_STATUS_LABELS.draft },
  { value: 'waiting_payment', label: ORDER_STATUS_LABELS.waiting_payment },
  { value: 'pending', label: ORDER_STATUS_LABELS.pending },
  { value: 'confirmed', label: ORDER_STATUS_LABELS.confirmed },
  { value: 'paid', label: ORDER_STATUS_LABELS.paid },
  { value: 'completed', label: ORDER_STATUS_LABELS.completed },
  { value: 'cancelled', label: ORDER_STATUS_LABELS.cancelled },
];

export const PAYMENT_STATUSES = [
  'unpaid',
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially-refunded',
] as const satisfies readonly PaymentStatus[];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Unpaid',
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  'partially-refunded': 'Partially Refunded',
};

export const PAYMENT_STATUS_OPTIONS: SelectOption[] = [
  { value: 'unpaid', label: PAYMENT_STATUS_LABELS.unpaid },
  { value: 'pending', label: PAYMENT_STATUS_LABELS.pending },
  { value: 'paid', label: PAYMENT_STATUS_LABELS.paid },
  { value: 'failed', label: PAYMENT_STATUS_LABELS.failed },
  { value: 'refunded', label: PAYMENT_STATUS_LABELS.refunded },
  {
    value: 'partially-refunded',
    label: PAYMENT_STATUS_LABELS['partially-refunded'],
  },
];

export const PAYMENT_METHODS = [
  'cash',
  'card',
  'bank-transfer',
  'wallet',
  'installment',
  'other',
] as const satisfies readonly PaymentMethod[];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  'bank-transfer': 'Bank Transfer',
  wallet: 'Wallet',
  installment: 'Installment',
  other: 'Other',
};

export const PAYMENT_METHOD_OPTIONS: SelectOption[] = [
  { value: 'cash', label: PAYMENT_METHOD_LABELS.cash },
  { value: 'card', label: PAYMENT_METHOD_LABELS.card },
  {
    value: 'bank-transfer',
    label: PAYMENT_METHOD_LABELS['bank-transfer'],
  },
  { value: 'wallet', label: PAYMENT_METHOD_LABELS.wallet },
  { value: 'installment', label: PAYMENT_METHOD_LABELS.installment },
  { value: 'other', label: PAYMENT_METHOD_LABELS.other },
];

export const PRODUCT_STATUSES = [
  'draft',
  'active',
  'out-of-stock',
  'archived',
] as const satisfies readonly ProductStatus[];

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  'out-of-stock': 'Out of Stock',
  archived: 'Archived',
};

export const PRODUCT_STATUS_OPTIONS: SelectOption[] = [
  { value: 'draft', label: PRODUCT_STATUS_LABELS.draft },
  { value: 'active', label: PRODUCT_STATUS_LABELS.active },
  { value: 'out-of-stock', label: PRODUCT_STATUS_LABELS['out-of-stock'] },
  { value: 'archived', label: PRODUCT_STATUS_LABELS.archived },
];

export const USER_STATUSES = [
  'active',
  'inactive',
  'invited',
] as const satisfies readonly UserStatus[];

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  invited: 'Invited',
};

export const USER_STATUS_OPTIONS: SelectOption[] = [
  { value: 'active', label: USER_STATUS_LABELS.active },
  { value: 'inactive', label: USER_STATUS_LABELS.inactive },
  { value: 'invited', label: USER_STATUS_LABELS.invited },
];

export const NOTIFICATION_SEVERITIES = [
  'neutral',
  'info',
  'success',
  'warning',
  'danger',
] as const satisfies readonly NotificationSeverity[];

export const NOTIFICATION_SEVERITY_LABELS: Record<NotificationSeverity, string> =
  {
    neutral: 'Neutral',
    info: 'Info',
    success: 'Success',
    warning: 'Warning',
    danger: 'Danger',
  };

export const NOTIFICATION_SEVERITY_OPTIONS: SelectOption[] = [
  { value: 'neutral', label: NOTIFICATION_SEVERITY_LABELS.neutral },
  { value: 'info', label: NOTIFICATION_SEVERITY_LABELS.info },
  { value: 'success', label: NOTIFICATION_SEVERITY_LABELS.success },
  { value: 'warning', label: NOTIFICATION_SEVERITY_LABELS.warning },
  { value: 'danger', label: NOTIFICATION_SEVERITY_LABELS.danger },
];

export const NOTIFICATION_TYPES = [
  'system',
  'lead',
  'order',
  'payment',
  'conversation',
  'user',
] as const satisfies readonly NotificationType[];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  system: 'System',
  lead: 'Lead',
  order: 'Order',
  payment: 'Payment',
  conversation: 'Conversation',
  user: 'User',
};

export const NOTIFICATION_TYPE_OPTIONS: SelectOption[] = [
  { value: 'system', label: NOTIFICATION_TYPE_LABELS.system },
  { value: 'lead', label: NOTIFICATION_TYPE_LABELS.lead },
  { value: 'order', label: NOTIFICATION_TYPE_LABELS.order },
  { value: 'payment', label: NOTIFICATION_TYPE_LABELS.payment },
  {
    value: 'conversation',
    label: NOTIFICATION_TYPE_LABELS.conversation,
  },
  { value: 'user', label: NOTIFICATION_TYPE_LABELS.user },
];

export const MESSAGE_SENDER_TYPES = [
  'customer',
  'operator',
  'ai-agent',
  'system',
] as const satisfies readonly MessageSenderType[];

export const MESSAGE_SENDER_TYPE_LABELS: Record<MessageSenderType, string> = {
  customer: 'Customer',
  operator: 'Operator',
  'ai-agent': 'AI Agent',
  system: 'System',
};

export const MESSAGE_SENDER_TYPE_OPTIONS: SelectOption[] = [
  { value: 'customer', label: MESSAGE_SENDER_TYPE_LABELS.customer },
  { value: 'operator', label: MESSAGE_SENDER_TYPE_LABELS.operator },
  { value: 'ai-agent', label: MESSAGE_SENDER_TYPE_LABELS['ai-agent'] },
  { value: 'system', label: MESSAGE_SENDER_TYPE_LABELS.system },
];

export const MESSAGE_DELIVERY_STATUSES = [
  'pending',
  'sent',
  'delivered',
  'read',
  'failed',
] as const satisfies readonly MessageDeliveryStatus[];

export const MESSAGE_DELIVERY_STATUS_LABELS: Record<
  MessageDeliveryStatus,
  string
> = {
  pending: 'Pending',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Failed',
};

export const MESSAGE_DELIVERY_STATUS_OPTIONS: SelectOption[] = [
  { value: 'pending', label: MESSAGE_DELIVERY_STATUS_LABELS.pending },
  { value: 'sent', label: MESSAGE_DELIVERY_STATUS_LABELS.sent },
  { value: 'delivered', label: MESSAGE_DELIVERY_STATUS_LABELS.delivered },
  { value: 'read', label: MESSAGE_DELIVERY_STATUS_LABELS.read },
  { value: 'failed', label: MESSAGE_DELIVERY_STATUS_LABELS.failed },
];
