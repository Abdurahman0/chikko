import type { AuditInfo, CurrencyCode, EntityId, TimestampString } from './common';

export type PaymentStatus =
  | 'unpaid'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially-refunded';

export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'bank-transfer'
  | 'wallet'
  | 'installment'
  | 'other';

export interface Payment extends AuditInfo {
  id: EntityId;
  orderId: EntityId;
  transactionId?: string;
  method: PaymentMethod;
  amount: number;
  currency: CurrencyCode;
  status: PaymentStatus;
  paidAt?: TimestampString;
}
