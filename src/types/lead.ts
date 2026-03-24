import type {
  AuditInfo,
  ContactInfo,
  EntityId,
  TimestampString,
} from './common';
import type { UserSummary } from './user';

export type LeadSource = 'telegram' | 'instagram' | 'manual' | 'website' | 'web';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'negotiating'
  | 'converted'
  | 'lost';

export type LeadMetadataValue = string | number | boolean | null;

export type LeadMetadata = Record<string, LeadMetadataValue>;

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
  source: LeadSource;
  status: LeadStatus;
  assignedOperator?: UserSummary;
  instagramUsername?: string;
  telegramUsername?: string;
  notes?: string;
  metadata?: LeadMetadata | null;
  notesSummary?: string;
  tags?: string[];
  lastMessageAt?: TimestampString;
  lastContactAt?: TimestampString;
  replied?: boolean;
  dmSent?: boolean;
}

export interface LeadMutationInput {
  full_name: string;
  phone?: string | null;
  email?: string | null;
  instagram_username?: string | null;
  telegram_username?: string | null;
  source: LeadSource;
  status: LeadStatus;
  notes?: string | null;
  metadata?: LeadMetadata | null;
  assigned_operator?: EntityId | null;
}

export type LeadPatchInput = Partial<LeadMutationInput>;
