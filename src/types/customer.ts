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
  metadata?: Record<string, string | number | boolean | null>;
  lead?: LeadSummary;
  assignedOperator?: UserSummary;
  segments?: string[];
  totalOrders: number;
  totalSpent: number;
  currency: CurrencyCode;
  lastOrderAt?: TimestampString;
  notesSummary?: string;
}
