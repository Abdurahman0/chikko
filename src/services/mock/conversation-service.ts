import type { ConversationService } from '../core/contracts';
import { mockDataStore } from './dataset';
import { filterItemsBySearch, findById, paginateItems, withMockDelay } from './helpers';

export const mockConversationService: ConversationService = {
  async list(params) {
    const items = filterItemsBySearch(
      mockDataStore.conversations,
      params?.search,
      (conversation) =>
        `${conversation.participantName} ${conversation.platform} ${conversation.lastMessagePreview ?? ''}`,
    );

    return withMockDelay(paginateItems(items, params), 200);
  },
  async getById(id) {
    return withMockDelay(findById(mockDataStore.conversations, id), 150);
  },
  async listMessages(conversationId) {
    return withMockDelay(
      mockDataStore.messagesByConversationId.get(conversationId) ?? [],
      180,
    );
  },
};
