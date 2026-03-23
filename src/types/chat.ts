import type { AuditInfo, EntityId, PlatformChannel, TimestampString } from './common';
import type { CustomerSummary } from './customer';
import type { LeadSummary } from './lead';
import type { UserSummary } from './user';

export type ConversationParticipantType = 'lead' | 'customer';

export type MessageSenderType = 'customer' | 'operator' | 'ai-agent' | 'system';

export type MessageDeliveryStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export interface ChatAttachment {
  id: EntityId;
  name: string;
  fileUrl: string;
  mimeType?: string;
}

export interface ConversationSummary {
  id: EntityId;
  platform: PlatformChannel;
  lastMessagePreview?: string;
  unreadCount: number;
  updatedAt: TimestampString;
}

export interface Conversation extends AuditInfo {
  id: EntityId;
  platform: PlatformChannel;
  participantType: ConversationParticipantType;
  participantName: string;
  lead?: LeadSummary;
  customer?: CustomerSummary;
  lastMessagePreview?: string;
  unreadCount: number;
  assignedOperator?: UserSummary;
  lastMessageAt?: TimestampString;
}

export interface ChatMessage {
  id: EntityId;
  conversationId: EntityId;
  senderType: MessageSenderType;
  senderName?: string;
  text: string;
  attachments?: ChatAttachment[];
  deliveryStatus?: MessageDeliveryStatus;
  createdAt: TimestampString;
}
