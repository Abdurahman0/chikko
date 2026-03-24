import type {
  ChatMessage,
  Conversation,
  Customer,
  Lead,
  MessageDirection,
  MessageSenderType,
  UserSummary,
} from '../../types/domain';
import {
  createMockId,
  createPersonName,
  cycleValue,
  timestampFromIndex,
} from '../core/helpers';
import { MOCK_MESSAGE_SNIPPETS } from '../core/catalogs';
import { toCustomerSummary, toLeadSummary } from '../core/summaries';
import { generateMockCustomers } from './customers';
import { generateMockLeads } from './leads';
import { generateMockUserSummaries } from './users';

interface GenerateMockConversationsOptions {
  leads?: Lead[];
  customers?: Customer[];
  operators?: UserSummary[];
}

const CHAT_CHANNELS: readonly Conversation['channel'][] = [
  'telegram',
  'instagram',
];

const SESSION_STATES: readonly Conversation['state'][] = [
  'open',
  'pending',
  'resolved',
];

const SYSTEM_TEXTS = [
  "Suhbat CRM tizimiga ulab olindi.",
  "AI assistent yoqildi.",
  "Operator sessiyani qabul qildi.",
  "Sessiya holati yangilandi.",
] as const;

function parseSessionSeed(sessionId: string): number {
  const match = sessionId.match(/(\d+)$/);
  if (!match) {
    return 0;
  }

  return Math.max(0, Number(match[1]) - 1);
}

function getMessageDirection(senderType: MessageSenderType): MessageDirection {
  if (senderType === 'customer') {
    return 'incoming';
  }

  return 'outgoing';
}

function buildMessageContent(seed: number, index: number, senderType: MessageSenderType): string {
  if (senderType === 'system') {
    return cycleValue(SYSTEM_TEXTS, seed + index);
  }

  if (senderType === 'ai') {
    return `AI tavsiyasi: ${cycleValue(MOCK_MESSAGE_SNIPPETS, seed + index)}`;
  }

  return cycleValue(MOCK_MESSAGE_SNIPPETS, seed + index);
}

export function generateMockConversations(
  count: number,
  options?: GenerateMockConversationsOptions,
): Conversation[] {
  const leads = options?.leads ?? generateMockLeads(Math.max(count, 6));
  const customers = options?.customers ?? generateMockCustomers(Math.max(count, 6));
  const operators =
    options?.operators ?? generateMockUserSummaries(4, { roles: ['operator'] });

  return Array.from({ length: count }, (_, index) => {
    const channel = cycleValue(CHAT_CHANNELS, index);
    const hasLead = index % 3 !== 0;
    const hasCustomer = index % 4 !== 0;
    const lead = hasLead ? leads[index % leads.length]! : null;
    const customer = hasCustomer ? customers[index % customers.length]! : null;
    const assignedOperator =
      index % 5 === 0 ? null : cycleValue(operators, index);
    const aiPausedUntil =
      index % 6 === 0
        ? timestampFromIndex(-(index % 3), { hourOffset: 1 })
        : null;

    return {
      id: createMockId('session', index),
      channel,
      external_id:
        channel === 'telegram'
          ? `tg_${85000 + index}`
          : `ig_${92000 + index}`,
      lead: lead ? toLeadSummary(lead) : null,
      customer: customer ? toCustomerSummary(customer) : null,
      assigned_operator: assignedOperator,
      ai_paused_until: aiPausedUntil,
      is_operator_active: index % 4 !== 0,
      last_message_at: timestampFromIndex(index, {
        hourOffset: (index % 7) + 1,
      }),
      state: cycleValue(SESSION_STATES, index),
      last_message: cycleValue(MOCK_MESSAGE_SNIPPETS, index),
      created_at: timestampFromIndex(index + 12, { dayStep: 2 }),
      updated_at: timestampFromIndex(index, { minuteOffset: (index % 20) + 1 }),
    };
  });
}

export function generateMockChatMessages(
  sessionId: string,
  count = 10,
): ChatMessage[] {
  const seed = parseSessionSeed(sessionId);
  const operatorName = createPersonName(seed + 45).fullName;
  const senderPattern: MessageSenderType[] = [
    'customer',
    'operator',
    'customer',
    'ai',
    'customer',
    'system',
    'operator',
    'customer',
  ];

  return Array.from({ length: count }, (_, index) => {
    const senderType = cycleValue(senderPattern, seed + index);
    const direction = getMessageDirection(senderType);
    const createdAt = timestampFromIndex(seed, {
      minuteOffset: (count - index) * 7,
      hourOffset: (seed % 4) + 1,
    });
    const isIncomingCustomer = senderType === 'customer' && direction === 'incoming';
    const isRead = !isIncomingCustomer || index < count - 2 || seed % 3 === 0;

    return {
      id: createMockId(`message-${sessionId}`, index),
      created_at: createdAt,
      updated_at: createdAt,
      sender_type: senderType,
      direction,
      content: buildMessageContent(seed, index, senderType),
      external_message_id:
        senderType === 'customer'
          ? `ext-${sessionId}-${String(index + 1).padStart(2, '0')}`
          : null,
      metadata:
        index % 5 === 0
          ? {
              source: senderType,
              confidence: senderType === 'ai' ? 0.87 : null,
            }
          : null,
      is_read: isRead,
      session: sessionId,
      sent_by:
        senderType === 'operator'
          ? {
              id: `operator-${seed + 1}`,
              fullName: operatorName,
              role: 'operator' as const,
            }
          : null,
    };
  }).sort(
    (left, right) =>
      new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
  );
}
