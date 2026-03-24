import type {
  AddressInfo,
  AuditInfo,
  ContactInfo,
  CurrencyCode,
  EntityId,
  TimestampString,
} from './common';
import type { LeadSummary } from './lead';
import type { UserSummary } from './user';

export interface CustomerSummary {
  id: EntityId;
  fullName: string;
  phone?: string;
  username?: string;
}

export interface Customer extends AuditInfo {
  id: EntityId;
  fullName: string;
  username?: string;
  contact: ContactInfo;
  address?: AddressInfo;
  notes?: string;
  metadata?: CustomerMetadata | null;
  lead?: LeadSummary;
  assignedOperator?: UserSummary;
  segments?: string[];
  totalOrders: number;
  totalSpent: number;
  currency: CurrencyCode;
  lastOrderAt?: TimestampString;
  notesSummary?: string;
}

export type CustomerMetadataValue = string | number | boolean | null;

export type CustomerMetadata = Record<string, CustomerMetadataValue>;

export interface CustomerMutationInput {
  full_name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  metadata?: CustomerMetadata | null;
  lead?: EntityId | null;
  assigned_operator?: EntityId | null;
}

export type CustomerPatchInput = Partial<CustomerMutationInput>;
