import type {
  AddressInfo,
  AuditInfo,
  ContactInfo,
  CurrencyCode,
  EntityId,
  TimestampString,
} from './common';

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
  segments?: string[];
  totalOrders: number;
  totalSpent: number;
  currency: CurrencyCode;
  lastOrderAt?: TimestampString;
  notesSummary?: string;
}
