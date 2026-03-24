import type { NotificationService } from '../core/contracts';
import { createNotImplementedError } from './not-implemented';

export const apiNotificationService: NotificationService = {
  async list() {
    throw createNotImplementedError('NotificationService', 'list');
  },

  async getById() {
    throw createNotImplementedError('NotificationService', 'getById');
  },

  async listNotifications() {
    throw createNotImplementedError('NotificationService', 'listNotifications');
  },

  async getNotificationById() {
    throw createNotImplementedError('NotificationService', 'getNotificationById');
  },

  async markAsRead() {
    throw createNotImplementedError('NotificationService', 'markAsRead');
  },

  async markNotificationRead() {
    throw createNotImplementedError('NotificationService', 'markNotificationRead');
  },
};
