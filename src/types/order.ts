import type {
  AuditInfo,
  CurrencyCode,
  EntityId,
  TimestampString,
} from './common';
import type { CustomerSummary } from './customer';
import type { LeadSummary } from './lead';
import type { ProductSummary } from './product';

export type OrderStatus =
  | 'draft'
  | 'waiting_payment'
  | 'pending'
  | 'confirmed'
  | 'paid'
  | 'completed'
  | 'cancelled';

export type OrderSource = 'telegram' | 'instagram' | 'manual';

export type OrderPaymentStatus =
  | 'unpaid'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially-refunded';

export interface OrderItem {
  id: EntityId;
  product: ProductSummary;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  totalPrice?: number;
}

export interface OrderItemMutationInput {
  productId: EntityId;
  quantity: number;
  unitPrice: number;
}

export interface Order extends AuditInfo {
  id: EntityId;
  customer?: CustomerSummary;
  lead?: LeadSummary;
  status: OrderStatus;
  source: OrderSource;
  contactName: string;
  contactPhone: string;
  shippingAddress: string;
  notes?: string;
  metadata?: Record<string, string | number | boolean | null>;
  aiGenerated: boolean;
  totalAmount: number;
  currency: CurrencyCode;
  items: OrderItem[];
  orderNumber?: string;
  orderStatus?: OrderStatus;
  paymentStatus?: OrderPaymentStatus;
  notesSummary?: string;
}

export interface OrderMutationInput {
  customerId?: EntityId;
  status: OrderStatus;
  source: OrderSource;
  contactName: string;
  contactPhone: string;
  shippingAddress: string;
  notes: string;
  metadata?: Record<string, string | number | boolean | null>;
  aiGenerated: boolean;
  items: OrderItemMutationInput[];
  currency?: CurrencyCode;
}

export type OrderPatchInput = Partial<OrderMutationInput>;

export interface OrderSummary {
  id: EntityId;
  status: OrderStatus;
  source: OrderSource;
  totalAmount: number;
  currency: CurrencyCode;
  contactName: string;
  contactPhone: string;
  updatedAt: TimestampString;
}
