import type { NotificationService } from '../core/contracts';
import { mockDataStore } from './dataset';
import { withMockDelay } from './helpers';

export const mockNotificationService: NotificationService = {
  async list() {
    return withMockDelay([...mockDataStore.notifications], 130);
  },
  async markAsRead(id) {
    mockDataStore.notifications = mockDataStore.notifications.map((notification) =>
      notification.id === id
        ? { ...notification, isRead: true }
        : notification,
    );

    return withMockDelay(undefined, 120);
  },
};
