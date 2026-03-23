import type {
  AuditInfo,
  CurrencyCode,
  EntityId,
  PlatformChannel,
} from './common';
import type { CustomerSummary } from './customer';
import type { PaymentStatus } from './payment';
import type { ProductSummary } from './product';
import type { UserSummary } from './user';

export type OrderStatus =
  | 'draft'
  | 'pending'
  | 'confirmed'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export interface OrderItem {
  id: EntityId;
  product: ProductSummary;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderSummary {
  id: EntityId;
  orderNumber: string;
  totalAmount: number;
  currency: CurrencyCode;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
}

export interface Order extends AuditInfo {
  id: EntityId;
  orderNumber: string;
  customer: CustomerSummary;
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  totalAmount: number;
  currency: CurrencyCode;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  assignedOperator?: UserSummary;
  source: PlatformChannel;
  notesSummary?: string;
}
