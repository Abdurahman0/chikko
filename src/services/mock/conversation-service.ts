import type {
  ChatMessage,
  Conversation,
  EntityId,
  MessageListParams,
  SendMessageInput,
  SessionListParams,
} from '../../types/domain';
import type { ConversationService } from '../core/contracts';
import { mockDataStore } from './dataset';
import { findById, paginateItems, withMockDelay } from './helpers';

type SessionOrderingField = 'last_message_at' | 'created_at' | 'updated_at';
type MessageOrderingField = 'created_at' | 'updated_at';

function resolveSessionOrdering(params?: SessionListParams): {
  field: SessionOrderingField;
  direction: 'asc' | 'desc';
} {
  const requestedOrdering = params?.ordering?.trim();
  if (requestedOrdering) {
    const direction = requestedOrdering.startsWith('-') ? 'desc' : 'asc';
    const field = requestedOrdering.replace('-', '');

    if (
      field === 'last_message_at' ||
      field === 'created_at' ||
      field === 'updated_at'
    ) {
      return { field, direction };
    }
  }

  const sortBy = params?.sortBy;
  const sortDirection = params?.sortDirection === 'asc' ? 'asc' : 'desc';

  if (sortBy === 'last_message_at' || sortBy === 'lastMessageAt') {
    return { field: 'last_message_at', direction: sortDirection };
  }

  if (sortBy === 'created_at' || sortBy === 'createdAt') {
    return { field: 'created_at', direction: sortDirection };
  }

  if (sortBy === 'updated_at' || sortBy === 'updatedAt') {
    return { field: 'updated_at', direction: sortDirection };
  }

  return { field: 'last_message_at', direction: 'desc' };
}

function resolveMessageOrdering(params?: MessageListParams): {
  field: MessageOrderingField;
  direction: 'asc' | 'desc';
} {
  const requestedOrdering = params?.ordering?.trim();
  if (requestedOrdering) {
    const direction = requestedOrdering.startsWith('-') ? 'desc' : 'asc';
    const field = requestedOrdering.replace('-', '');

    if (field === 'created_at' || field === 'updated_at') {
      return { field, direction };
    }
  }

  const sortBy = params?.sortBy;
  const sortDirection = params?.sortDirection === 'asc' ? 'asc' : 'desc';

  if (sortBy === 'updated_at' || sortBy === 'updatedAt') {
    return { field: 'updated_at', direction: sortDirection };
  }

  return { field: 'created_at', direction: sortDirection };
}

function compareSession(
  left: Conversation,
  right: Conversation,
  field: SessionOrderingField,
): number {
  const leftValue =
    field === 'last_message_at'
      ? left.last_message_at
      : field === 'created_at'
        ? left.created_at
        : left.updated_at;
  const rightValue =
    field === 'last_message_at'
      ? right.last_message_at
      : field === 'created_at'
        ? right.created_at
        : right.updated_at;

  const leftTime = leftValue ? new Date(leftValue).getTime() : 0;
  const rightTime = rightValue ? new Date(rightValue).getTime() : 0;
  return leftTime - rightTime;
}

function compareMessage(
  left: ChatMessage,
  right: ChatMessage,
  field: MessageOrderingField,
): number {
  const leftValue = field === 'created_at' ? left.created_at : left.updated_at;
  const rightValue = field === 'created_at' ? right.created_at : right.updated_at;
  return new Date(leftValue).getTime() - new Date(rightValue).getTime();
}

function getAllMessages(): ChatMessage[] {
  return Array.from(mockDataStore.messagesByConversationId.values()).flat();
}

function findSessionById(sessionId: EntityId): Conversation | null {
  return mockDataStore.conversations.find((session) => session.id === sessionId) ?? null;
}

function updateSessionAfterMessage(sessionId: EntityId, message: ChatMessage): void {
  const index = mockDataStore.conversations.findIndex((session) => session.id === sessionId);
  if (index < 0) {
    return;
  }

  const current = mockDataStore.conversations[index]!;
  const next: Conversation = {
    ...current,
    last_message: message.content,
    last_message_at: message.created_at,
    updated_at: message.updated_at,
    state: 'open',
  };

  mockDataStore.conversations.splice(index, 1, next);
}

export const mockConversationService: ConversationService = {
  async list(params) {
    return mockConversationService.listSessions(params);
  },

  async getById(id) {
    return mockConversationService.getSessionById(id);
  },

  async listSessions(params) {
    const { field, direction } = resolveSessionOrdering(params);
    const search = params?.search?.trim().toLowerCase();

    const filtered = mockDataStore.conversations.filter((session) => {
      const matchesSearch =
        !search ||
        [
          session.external_id ?? '',
          session.last_message ?? '',
          session.lead?.fullName ?? '',
          session.customer?.fullName ?? '',
          session.assigned_operator?.fullName ?? '',
          session.channel,
        ]
          .join(' ')
          .toLowerCase()
          .includes(search);
      const matchesChannel = !params?.channel || session.channel === params.channel;
      const matchesAssignedOperator =
        !params?.assigned_operator ||
        session.assigned_operator?.id === params.assigned_operator;
      const matchesOperatorActive =
        typeof params?.is_operator_active !== 'boolean' ||
        session.is_operator_active === params.is_operator_active;

      return (
        matchesSearch &&
        matchesChannel &&
        matchesAssignedOperator &&
        matchesOperatorActive
      );
    });

    const sorted = [...filtered].sort((left, right) => {
      const compared = compareSession(left, right, field);
      if (compared === 0) {
        return right.id.localeCompare(left.id);
      }

      return direction === 'asc' ? compared : -compared;
    });

    return withMockDelay(paginateItems(sorted, params), 210);
  },

  async getSessionById(id) {
    return withMockDelay(findSessionById(id), 140);
  },

  async listMessages(params) {
    const { field, direction } = resolveMessageOrdering(params);
    const search = params?.search?.trim().toLowerCase();
    const baseMessages = params?.session
      ? mockDataStore.messagesByConversationId.get(params.session) ?? []
      : getAllMessages();

    const filtered = baseMessages.filter((message) => {
      const matchesSession = !params?.session || message.session === params.session;
      const matchesSender =
        !params?.sender_type || message.sender_type === params.sender_type;
      const matchesDirection =
        !params?.direction || message.direction === params.direction;
      const matchesSearch =
        !search ||
        `${message.content} ${message.external_message_id ?? ''}`
          .toLowerCase()
          .includes(search);

      return matchesSession && matchesSender && matchesDirection && matchesSearch;
    });

    const sorted = [...filtered].sort((left, right) => {
      const compared = compareMessage(left, right, field);
      if (compared === 0) {
        return left.id.localeCompare(right.id);
      }

      return direction === 'asc' ? compared : -compared;
    });

    return withMockDelay(paginateItems(sorted, params), 180);
  },

  async getMessageById(id) {
    return withMockDelay(
      getAllMessages().find((message) => message.id === id) ?? null,
      140,
    );
  },

  async sendMessage(sessionId, payload) {
    const session = findSessionById(sessionId);
    if (!session) {
      throw new Error('Session not found.');
    }

    const content = payload.content.trim();
    if (!content) {
      throw new Error('Message content is required.');
    }

    const now = new Date().toISOString();
    const messages = mockDataStore.messagesByConversationId.get(sessionId) ?? [];
    const nextMessage: ChatMessage = {
      id: `message-${sessionId}-${Date.now().toString(36)}`,
      created_at: now,
      updated_at: now,
      sender_type: 'operator',
      direction: 'outgoing',
      content,
      external_message_id: payload.external_message_id?.trim() || null,
      metadata: payload.metadata ?? null,
      is_read: true,
      session: sessionId,
      sent_by:
        mockDataStore.currentUser
          ? {
              id: mockDataStore.currentUser.id,
              fullName: mockDataStore.currentUser.fullName,
              role: mockDataStore.currentUser.role,
              avatarUrl: mockDataStore.currentUser.avatarUrl,
            }
          : null,
    };

    messages.push(nextMessage);
    mockDataStore.messagesByConversationId.set(sessionId, messages);
    updateSessionAfterMessage(sessionId, nextMessage);

    return withMockDelay(nextMessage, 120);
  },

  async markSessionRead(sessionId) {
    const messages = mockDataStore.messagesByConversationId.get(sessionId);
    if (!messages) {
      return withMockDelay(undefined, 80);
    }

    let isUpdated = false;
    const nextMessages = messages.map((message) => {
      if (
        message.sender_type === 'customer' &&
        message.direction === 'incoming' &&
        !message.is_read
      ) {
        isUpdated = true;
        return {
          ...message,
          is_read: true,
          updated_at: new Date().toISOString(),
        };
      }

      return message;
    });

    if (isUpdated) {
      mockDataStore.messagesByConversationId.set(sessionId, nextMessages);
      const session = findSessionById(sessionId);
      if (session) {
        session.updated_at = new Date().toISOString();
      }
    }

    return withMockDelay(undefined, 100);
  },
};
