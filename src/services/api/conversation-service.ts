import type { ConversationService } from '../core/contracts';
import { createNotImplementedError } from './not-implemented';

export const apiConversationService: ConversationService = {
  async list() {
    throw createNotImplementedError('ConversationService', 'list');
  },
  async getById() {
    throw createNotImplementedError('ConversationService', 'getById');
  },
  async listSessions() {
    throw createNotImplementedError('ConversationService', 'listSessions');
  },
  async getSessionById() {
    throw createNotImplementedError('ConversationService', 'getSessionById');
  },
  async listMessages() {
    throw createNotImplementedError('ConversationService', 'listMessages');
  },
  async getMessageById() {
    throw createNotImplementedError('ConversationService', 'getMessageById');
  },
  async sendMessage() {
    throw createNotImplementedError('ConversationService', 'sendMessage');
  },
  async markSessionRead() {
    throw createNotImplementedError('ConversationService', 'markSessionRead');
  },
};
