import type {
  AuditInfo,
  ContactInfo,
  EntityId,
  PlatformChannel,
  TimestampString,
} from './common';
import type { UserSummary } from './user';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'negotiating'
  | 'converted'
  | 'lost'
  | 'archived';

export interface LeadSummary {
  id: EntityId;
  fullName: string;
  status: LeadStatus;
  phone?: string;
  username?: string;
}

export interface Lead extends AuditInfo {
  id: EntityId;
  fullName: string;
  username?: string;
  contact: ContactInfo;
  source: PlatformChannel;
  status: LeadStatus;
  assignedOperator?: UserSummary;
  notesSummary?: string;
  tags?: string[];
  lastMessageAt?: TimestampString;
  lastContactAt?: TimestampString;
  replied?: boolean;
  dmSent?: boolean;
}
