import type { AuditInfo, EntityId, TimestampString } from './common';

export type CourierOrderStatus =
  | 'pending'
  | 'assigned'
  | 'in_transit'
  | 'delivered';

export interface Courier extends AuditInfo {
  id: EntityId;
  telegramUserId: string;
  firstName: string;
  username?: string;
  phone?: string;
  isActive: boolean;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface CourierMutationInput {
  telegramUserId: string;
  firstName: string;
  username: string;
  phone: string;
  isActive: boolean;
  metadata?: Record<string, string | number | boolean | null>;
}

export type CourierPatchInput = Partial<CourierMutationInput>;

export interface CourierSummary {
  id: EntityId;
  firstName: string;
  username?: string;
  phone?: string;
  isActive: boolean;
}

export interface CourierListParams {
  page: number;
  pageSize: number;
  search?: string;
  is_active?: boolean;
  ordering?: string;
}

export interface CourierOrder extends AuditInfo {
  id: EntityId;
  orderId: EntityId;
  orderDetail?: string;
  orderInfo?: CourierOrderInfo;
  courier?: Courier;
  status: CourierOrderStatus;
  groupChatId?: string;
  groupThreadId?: string;
  offerMessageId?: string;
  activeMessageId?: string;
  awaitingCancelReason: boolean;
  cancelReason?: string;
  acceptedAt?: TimestampString;
  inTransitAt?: TimestampString;
  deliveredAt?: TimestampString;
  cancelledAt?: TimestampString;
  lastReminderAt?: TimestampString;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface CourierOrderItemDetail {
  id: EntityId;
  productId?: EntityId;
  productName?: string;
  productImageUrl?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CourierOrderInfo {
  id: EntityId;
  status?: string;
  contactName?: string;
  contactPhone?: string;
  shippingAddress?: string;
  totalAmount: number;
  items: CourierOrderItemDetail[];
}

export interface CourierOrderMutationInput {
  order?: EntityId;
  status: CourierOrderStatus;
  awaitingCancelReason: boolean;
  cancelReason: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export type CourierOrderPatchInput = Partial<CourierOrderMutationInput>;

export interface CourierOrderListParams {
  page: number;
  pageSize: number;
  search?: string;
  courier?: EntityId;
  status?: CourierOrderStatus;
  ordering?: string;
}
