import type { ConversationService } from '../core/contracts';
import { createNotImplementedError } from './not-implemented';

export const apiConversationService: ConversationService = {
  async list() {
    throw createNotImplementedError('ConversationService', 'list');
  },
  async getById() {
    throw createNotImplementedError('ConversationService', 'getById');
  },
  async listMessages() {
    throw createNotImplementedError('ConversationService', 'listMessages');
  },
};
