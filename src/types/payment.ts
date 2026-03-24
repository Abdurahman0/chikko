import type { EntityId, SortDirection, TimestampString } from './common';

export type PaymentStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'verified'
  | 'failed';

export type PaymentMethod = 'manual' | 'payme' | 'click';

export type PaymentMetadataValue = string | number | boolean | null;

export type PaymentMetadata = Record<string, PaymentMetadataValue>;

export interface Payment {
  id: EntityId;
  created_at: TimestampString;
  updated_at: TimestampString;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  screenshot: string | null;
  last_four_digits: string | null;
  submitted_by_name: string;
  reviewed_at: TimestampString | null;
  metadata: PaymentMetadata | null;
  verification_reference: string | null;
  order: EntityId;
  reviewed_by: string | null;
}

export interface PaymentMutationInput {
  amount: number;
  method: PaymentMethod;
  screenshot?: string | null;
  last_four_digits?: string | null;
  submitted_by_name: string;
  metadata?: PaymentMetadata | null;
  verification_reference?: string | null;
  order: EntityId;
}

export type PaymentUpdateInput = Partial<PaymentMutationInput>;

export interface PaymentListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: PaymentStatus;
  method?: PaymentMethod;
  order?: EntityId;
  ordering?: string;
  sortBy?: string;
  sortDirection?: SortDirection;
}
