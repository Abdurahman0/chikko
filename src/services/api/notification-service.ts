import type { NotificationService } from '../core/contracts';
import type { PaginatedResult } from '../../types/domain';
import type {
  AppNotification,
  NotificationListParams,
} from '../../types/domain';
import { apiClient } from '../../lib/api-client';
import {
  mapNotificationDtoToModel,
  mapNotificationListDtoToItems,
  type NotificationDto,
} from '../adapters/notification-adapter';

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

function toPaginatedResult(
  allItems: AppNotification[],
  params?: NotificationListParams,
  totalItemsHint?: number | null,
): PaginatedResult<AppNotification> {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.max(1, params?.pageSize ?? 10);
  const start = (page - 1) * pageSize;
  const hasServerPaginationHint = typeof totalItemsHint === 'number' && totalItemsHint >= 0;

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

export const apiNotificationService: NotificationService = {
  async list(params) {
    return apiNotificationService.listNotifications(params);
  },

  async getById(id) {
    return apiNotificationService.getNotificationById(id);
  },

  async listNotifications(params) {
    const { data } = await apiClient.get<unknown>('/api/notifications/', {
      params: {
        search: params?.search,
        channel: params?.channel,
        is_read: params?.is_read,
        ordering: params?.ordering,
      },
    });

    const items = mapNotificationListDtoToItems(data);
    const payload =
      data && typeof data === 'object' && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : null;
    const totalItemsHint = readNumber(payload?.count);

    return toPaginatedResult(items, params, totalItemsHint);
  },

  async getNotificationById(id) {
    const { data } = await apiClient.get<NotificationDto>(`/api/notifications/${id}/`);
    return mapNotificationDtoToModel(data);
  },

  async markAsRead(id) {
    return apiNotificationService.markNotificationRead(id);
  },

  async markNotificationRead(id) {
    const { data } = await apiClient.post<NotificationDto>(
      `/api/notifications/${id}/mark_read/`,
    );
    return mapNotificationDtoToModel(data);
  },

  async markAllRead() {
    await apiClient.post('/api/notifications/mark_all_read/');
    return true;
  },

  async deleteAll() {
    await apiClient.delete('/api/notifications/delete_all/');
    return true;
  },
};
