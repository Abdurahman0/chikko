import type { NotificationService } from '../core/contracts';
import { createNotImplementedError } from './not-implemented';

export const apiNotificationService: NotificationService = {
  async list() {
    throw createNotImplementedError('NotificationService', 'list');
  },
  async markAsRead() {
    throw createNotImplementedError('NotificationService', 'markAsRead');
  },
};
