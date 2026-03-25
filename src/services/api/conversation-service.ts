import type { ConversationService } from '../core/contracts';
import type {
  ChatMessage,
  Conversation,
  MessageListParams,
  PaginatedResult,
  SessionListParams,
  SendMessageInput,
} from '../../types/domain';
import { apiClient } from '../../lib/api-client';
import {
  mapChatMessageDtoToModel,
  mapConversationDtoToModel,
  mapConversationListDtoToItems,
  mapMessageListDtoToItems,
  type ChatMessageDto,
  type ConversationDto,
} from '../adapters/conversation-adapter';

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toPaginatedResult<T>(
  allItems: T[],
  params: { page?: number; pageSize?: number } | undefined,
  totalItemsHint?: number | null,
): PaginatedResult<T> {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.max(1, params?.pageSize ?? 50);
  const hasServerPaginationHint = typeof totalItemsHint === 'number' && totalItemsHint >= 0;
  const start = (page - 1) * pageSize;

  const items = hasServerPaginationHint
    ? allItems
    : allItems.slice(start, start + pageSize);
  const totalItems = hasServerPaginationHint ? totalItemsHint : allItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return {
    items,
    meta: {
      page: Math.min(page, totalPages),
      pageSize,
      totalItems,
      totalPages,
    },
  };
}

export const apiConversationService: ConversationService = {
  async list(params) {
    return apiConversationService.listSessions(params);
  },

  async getById(id) {
    return apiConversationService.getSessionById(id);
  },

  async getSessions(params) {
    return apiConversationService.listSessions(params);
  },

  async listSessions(params?: SessionListParams): Promise<PaginatedResult<Conversation>> {
    const { data } = await apiClient.get<unknown>('/api/chat/sessions/', {
      params: {
        page: params?.page,
        page_size: params?.pageSize,
        search: params?.search,
        channel: params?.channel,
        assigned_operator: params?.assigned_operator,
        is_operator_active: params?.is_operator_active,
        ordering: params?.ordering,
      },
    });

    const items = mapConversationListDtoToItems(data);
    const payload =
      data && typeof data === 'object' && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : null;
    const totalItemsHint = readNumber(payload?.count);

    return toPaginatedResult(items, params, totalItemsHint);
  },

  async getSessionById(id) {
    const { data } = await apiClient.get<ConversationDto>(`/api/chat/sessions/${id}/`);
    return mapConversationDtoToModel(data);
  },

  async getMessages(params) {
    return apiConversationService.listMessages(params);
  },

  async listMessages(params?: MessageListParams): Promise<PaginatedResult<ChatMessage>> {
    const { data } = await apiClient.get<unknown>('/api/chat/messages/', {
      params: {
        page: params?.page,
        page_size: params?.pageSize,
        session: params?.session,
        sender_type: params?.sender_type,
        direction: params?.direction,
        search: params?.search,
        ordering: params?.ordering,
      },
    });

    const items = mapMessageListDtoToItems(data);
    const payload =
      data && typeof data === 'object' && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : null;
    const totalItemsHint = readNumber(payload?.count);

    return toPaginatedResult(items, params, totalItemsHint);
  },

  async getMessageById(id) {
    const { data } = await apiClient.get<ChatMessageDto>(`/api/chat/messages/${id}/`);
    return mapChatMessageDtoToModel(data);
  },

  async deleteSession(sessionId) {
    await apiClient.delete(`/api/chat/sessions/${sessionId}/`);
    return true;
  },

  async sendMessage(sessionId, payload: SendMessageInput) {
    const { data } = await apiClient.post<ChatMessageDto>(
      `/api/chat/sessions/${sessionId}/send_message/`,
      {
        content: payload.content,
        external_message_id: payload.external_message_id,
        metadata: payload.metadata,
      },
    );

    return mapChatMessageDtoToModel(data, sessionId);
  },

  async markSessionRead(sessionId) {
    const { data } = await apiClient.post<ConversationDto>(
      `/api/chat/sessions/${sessionId}/mark_read/`,
    );
    return mapConversationDtoToModel(data);
  },
};
