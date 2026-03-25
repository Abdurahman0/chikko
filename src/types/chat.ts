import type { EntityId, SortDirection, TimestampString } from './common';
import type { CustomerSummary } from './customer';
import type { LeadSummary } from './lead';
import type { UserSummary } from './user';

export type ChatChannel = 'telegram' | 'instagram' | 'web' | 'manual';

export type ConversationState = 'open' | 'pending' | 'resolved';

export type MessageSenderType = 'customer' | 'ai' | 'operator' | 'system';

export type MessageDirection = 'incoming' | 'outgoing';

export type MessageDeliveryStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export interface Conversation {
  id: EntityId;
  channel: ChatChannel;
  external_id: string | null;
  lead: LeadSummary | null;
  customer: CustomerSummary | null;
  assigned_operator: UserSummary | null;
  ai_paused_until: TimestampString | null;
  is_operator_active: boolean;
  last_message_at: TimestampString | null;
  state: ConversationState;
  state_data?: Record<string, unknown> | null;
  last_message: string | null;
  last_message_payload?: ChatMessage | null;
  unread_count?: number;
  created_at: TimestampString;
  updated_at: TimestampString;
}

export interface ChatMessage {
  id: EntityId;
  created_at: TimestampString;
  updated_at: TimestampString;
  sender_type: MessageSenderType;
  direction: MessageDirection;
  content: string;
  external_message_id: string | null;
  metadata: Record<string, string | number | boolean | null> | null;
  is_read: boolean;
  session: EntityId;
  sent_by: UserSummary | null;
}

export interface SessionListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  channel?: ChatChannel;
  assigned_operator?: EntityId;
  is_operator_active?: boolean;
  ordering?: string;
  sortBy?: string;
  sortDirection?: SortDirection;
}

export interface MessageListParams {
  page?: number;
  pageSize?: number;
  session?: EntityId;
  sender_type?: MessageSenderType;
  direction?: MessageDirection;
  search?: string;
  ordering?: string;
  sortBy?: string;
  sortDirection?: SortDirection;
}

export interface SendMessageInput {
  content: string;
  external_message_id?: string | null;
  metadata?: Record<string, string | number | boolean | null> | null;
}
