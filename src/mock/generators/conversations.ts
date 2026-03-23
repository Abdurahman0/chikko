import { MESSAGE_DELIVERY_STATUSES, MESSAGE_SENDER_TYPES, PLATFORM_CHANNELS } from '../../constants';
import type {
  ChatMessage,
  Conversation,
  Customer,
  Lead,
  UserSummary,
} from '../../types/domain';
import {
  createMockId,
  cycleValue,
  pickMany,
  timestampFromIndex,
} from '../core/helpers';
import { MOCK_CHAT_PREVIEWS, MOCK_MESSAGE_SNIPPETS } from '../core/catalogs';
import { toCustomerSummary, toLeadSummary } from '../core/summaries';
import { generateMockCustomers } from './customers';
import { generateMockLeads } from './leads';
import { generateMockUserSummaries } from './users';

interface GenerateMockConversationsOptions {
  leads?: Lead[];
  customers?: Customer[];
  operators?: UserSummary[];
}

export function generateMockConversations(
  count: number,
  options?: GenerateMockConversationsOptions,
): Conversation[] {
  const leads = options?.leads ?? generateMockLeads(Math.max(count, 4));
  const customers = options?.customers ?? generateMockCustomers(Math.max(count, 4));
  const operators =
    options?.operators ?? generateMockUserSummaries(3, { roles: ['operator'] });

  return Array.from({ length: count }, (_, index) => {
    const participantType = index % 2 === 0 ? 'lead' : 'customer';
    const lead = participantType === 'lead' ? leads[index % leads.length]! : undefined;
    const customer =
      participantType === 'customer'
        ? customers[index % customers.length]!
        : undefined;

    return {
      id: createMockId('conversation', index),
      platform: cycleValue(PLATFORM_CHANNELS, index),
      participantType,
      participantName: lead?.fullName ?? customer?.fullName ?? 'Unknown Contact',
      lead: lead ? toLeadSummary(lead) : undefined,
      customer: customer ? toCustomerSummary(customer) : undefined,
      lastMessagePreview: cycleValue(MOCK_CHAT_PREVIEWS, index),
      unreadCount: index % 4,
      assignedOperator: cycleValue(operators, index),
      lastMessageAt: timestampFromIndex(index, { hourOffset: 2 }),
      createdAt: timestampFromIndex(index + 8, { dayStep: 2 }),
      updatedAt: timestampFromIndex(index, { dayStep: 1 }),
    };
  });
}

export function generateMockChatMessages(
  conversationId: string,
  count = 6,
): ChatMessage[] {
  return Array.from({ length: count }, (_, index) => ({
    id: createMockId(`message-${conversationId}`, index),
    conversationId,
    senderType: cycleValue(MESSAGE_SENDER_TYPES, index),
    senderName: cycleValue(
      ['Customer', 'Operator', 'AI Assistant', 'System'],
      index,
    ),
    text: cycleValue(MOCK_MESSAGE_SNIPPETS, index),
    attachments:
      index % 5 === 0
        ? [
            {
              id: createMockId(`attachment-${conversationId}`, index),
              name: `attachment-${index + 1}.png`,
              fileUrl: `/mock/attachments/${conversationId}-${index + 1}.png`,
              mimeType: 'image/png',
            },
          ]
        : undefined,
    deliveryStatus: cycleValue(MESSAGE_DELIVERY_STATUSES, index),
    createdAt: timestampFromIndex(index, { minuteOffset: index * 7 }),
  }));
}
