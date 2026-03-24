import type { NotificationService } from '../core/contracts';
import type {
  AppNotification,
  NotificationListParams,
} from '../../types/domain';
import { mockDataStore } from './dataset';
import { findById, paginateItems, withMockDelay } from './helpers';

type NotificationOrderingField = 'created_at' | 'updated_at';

function resolveNotificationOrdering(params?: NotificationListParams): {
  field: NotificationOrderingField;
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

  if (sortBy === 'createdAt' || sortBy === 'created_at') {
    return { field: 'created_at', direction: sortDirection };
  }

  if (sortBy === 'updatedAt' || sortBy === 'updated_at') {
    return { field: 'updated_at', direction: sortDirection };
  }

  return { field: 'created_at', direction: 'desc' };
}

function compareNotification(
  left: AppNotification,
  right: AppNotification,
  field: NotificationOrderingField,
): number {
  const leftValue = field === 'created_at' ? left.created_at : left.updated_at;
  const rightValue = field === 'created_at' ? right.created_at : right.updated_at;
  return new Date(leftValue).getTime() - new Date(rightValue).getTime();
}

export const mockNotificationService: NotificationService = {
  async list(params) {
    return mockNotificationService.listNotifications(params);
  },

  async getById(id) {
    return mockNotificationService.getNotificationById(id);
  },

  async listNotifications(params) {
    const { field, direction } = resolveNotificationOrdering(params);
    const search = params?.search?.trim().toLowerCase();

    const filtered = mockDataStore.notifications.filter((notification) => {
      const matchesSearch =
        !search ||
        `${notification.title} ${notification.message}`
          .toLowerCase()
          .includes(search);
      const matchesChannel =
        !params?.channel || notification.channel === params.channel;
      const matchesReadState =
        typeof params?.is_read !== 'boolean' ||
        notification.is_read === params.is_read;

      return matchesSearch && matchesChannel && matchesReadState;
    });

    const sorted = [...filtered].sort((left, right) => {
      const compared = compareNotification(left, right, field);
      if (compared === 0) {
        return right.id.localeCompare(left.id);
      }

      return direction === 'asc' ? compared : -compared;
    });

    return withMockDelay(paginateItems(sorted, params), 170);
  },

  async getNotificationById(id) {
    return withMockDelay(findById(mockDataStore.notifications, id), 120);
  },

  async markAsRead(id) {
    return mockNotificationService.markNotificationRead(id);
  },

  async markNotificationRead(id) {
    const now = new Date().toISOString();
    let updatedNotification: AppNotification | null = null;

    mockDataStore.notifications = mockDataStore.notifications.map((notification) => {
      if (notification.id !== id) {
        return notification;
      }

      updatedNotification = {
        ...notification,
        is_read: true,
        updated_at: now,
      };
      return updatedNotification;
    });

    return withMockDelay(updatedNotification, 110);
  },
};
