import type { SelectOption } from '../types/common';
import type { LeadStatus } from '../types/lead';
import type { ProductStatus } from '../types/product';
import type { OrderStatus } from '../types/order';
import type { PaymentMethod, PaymentStatus } from '../types/payment';
import type {
  MessageDeliveryStatus,
  MessageSenderType,
} from '../types/chat';
import type { UserStatus } from '../types/user';

export const LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'negotiating',
  'converted',
  'lost',
] as const satisfies readonly LeadStatus[];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  negotiating: 'Negotiating',
  converted: 'Converted',
  lost: 'Lost',
};

export const LEAD_STATUS_OPTIONS: SelectOption[] = [
  { value: 'new', label: LEAD_STATUS_LABELS.new },
  { value: 'contacted', label: LEAD_STATUS_LABELS.contacted },
  { value: 'qualified', label: LEAD_STATUS_LABELS.qualified },
  { value: 'negotiating', label: LEAD_STATUS_LABELS.negotiating },
  { value: 'converted', label: LEAD_STATUS_LABELS.converted },
  { value: 'lost', label: LEAD_STATUS_LABELS.lost },
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
  'pending',
  'approved',
  'rejected',
  'verified',
  'failed',
] as const satisfies readonly PaymentStatus[];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  verified: 'Verified',
  failed: 'Failed',
};

export const PAYMENT_STATUS_OPTIONS: SelectOption[] = [
  { value: 'pending', label: PAYMENT_STATUS_LABELS.pending },
  { value: 'approved', label: PAYMENT_STATUS_LABELS.approved },
  { value: 'rejected', label: PAYMENT_STATUS_LABELS.rejected },
  { value: 'verified', label: PAYMENT_STATUS_LABELS.verified },
  { value: 'failed', label: PAYMENT_STATUS_LABELS.failed },
];

export const PAYMENT_METHODS = [
  'manual',
  'payme',
  'click',
] as const satisfies readonly PaymentMethod[];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  manual: 'Manual',
  payme: 'Payme',
  click: 'Click',
};

export const PAYMENT_METHOD_OPTIONS: SelectOption[] = [
  { value: 'manual', label: PAYMENT_METHOD_LABELS.manual },
  { value: 'payme', label: PAYMENT_METHOD_LABELS.payme },
  { value: 'click', label: PAYMENT_METHOD_LABELS.click },
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

export const MESSAGE_SENDER_TYPES = [
  'customer',
  'ai',
  'operator',
  'system',
] as const satisfies readonly MessageSenderType[];

export const MESSAGE_SENDER_TYPE_LABELS: Record<MessageSenderType, string> = {
  customer: 'Customer',
  ai: 'AI',
  operator: 'Operator',
  system: 'System',
};

export const MESSAGE_SENDER_TYPE_OPTIONS: SelectOption[] = [
  { value: 'customer', label: MESSAGE_SENDER_TYPE_LABELS.customer },
  { value: 'ai', label: MESSAGE_SENDER_TYPE_LABELS.ai },
  { value: 'operator', label: MESSAGE_SENDER_TYPE_LABELS.operator },
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
