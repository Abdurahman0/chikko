import type { NotificationService } from '../core/contracts';
import type { PaginatedResult } from '../../types/domain';
import type {
  AppNotification,
  EntityId,
  NotificationListParams,
} from '../../types/domain';
import { apiClient } from '../../lib/api-client';
import { getUserById } from './users.service';
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

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const userFullNameCache = new Map<EntityId, string | null>();
const pendingUserFullNameRequests = new Map<EntityId, Promise<string | null>>();

function readReviewerId(metadata: AppNotification['metadata']): EntityId | null {
  if (!metadata) {
    return null;
  }

  const value = metadata.reviewer_id;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function shouldResolveNotificationUserName(item: AppNotification): boolean {
  const user = item.user;
  if (!user) {
    return false;
  }

  const fullName = user.fullName.trim();
  if (!fullName) {
    return true;
  }

  if (fullName === user.id) {
    return true;
  }

  return UUID_PATTERN.test(fullName);
}

async function resolveUserFullNameById(userId: EntityId): Promise<string | null> {
  if (userFullNameCache.has(userId)) {
    return userFullNameCache.get(userId) ?? null;
  }

  const pendingRequest = pendingUserFullNameRequests.get(userId);
  if (pendingRequest) {
    return pendingRequest;
  }

  const request = (async () => {
    try {
      const user = await getUserById(userId);
      const fullName = user?.full_name?.trim() ?? '';
      const resolvedName = fullName || null;
      userFullNameCache.set(userId, resolvedName);
      return resolvedName;
    } catch {
      userFullNameCache.set(userId, null);
      return null;
    } finally {
      pendingUserFullNameRequests.delete(userId);
    }
  })();

  pendingUserFullNameRequests.set(userId, request);
  return request;
}

async function hydrateNotificationUsers(
  items: AppNotification[],
): Promise<AppNotification[]> {
  const targetUserIds = Array.from(new Set(
    items
      .flatMap((item) => {
        const reviewerId = readReviewerId(item.metadata);
        if (reviewerId) {
          return [reviewerId];
        }

        if (shouldResolveNotificationUserName(item) && item.user?.id) {
          return [item.user.id];
        }

        return [];
      })
      .filter((userId): userId is EntityId => userId.length > 0),
  ));

  if (!targetUserIds.length) {
    return items;
  }

  await Promise.all(targetUserIds.map((userId) => resolveUserFullNameById(userId)));

  return items.map((item) => {
    const reviewerId = readReviewerId(item.metadata);
    if (reviewerId) {
      const reviewerFullName = userFullNameCache.get(reviewerId) ?? null;
      if (!reviewerFullName) {
        return item;
      }

      const userRole = item.user?.role ?? 'operator';
      const nextMetadata = {
        ...(item.metadata ?? {}),
        reviewer_name: reviewerFullName,
      };

      return {
        ...item,
        metadata: nextMetadata,
        user: {
          id: reviewerId,
          fullName: reviewerFullName,
          role: userRole,
          avatarUrl: item.user?.avatarUrl,
        },
      };
    }

    const user = item.user;
    if (!user || !shouldResolveNotificationUserName(item)) {
      return item;
    }

    const resolvedFullName = userFullNameCache.get(user.id) ?? null;
    if (!resolvedFullName || resolvedFullName === user.fullName) {
      return item;
    }

    return {
      ...item,
      user: {
        ...user,
        fullName: resolvedFullName,
      },
    };
  });
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

    const mappedItems = mapNotificationListDtoToItems(data);
    const items = await hydrateNotificationUsers(mappedItems);
    const payload =
      data && typeof data === 'object' && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : null;
    const totalItemsHint = readNumber(payload?.count);

    return toPaginatedResult(items, params, totalItemsHint);
  },

  async getNotificationById(id) {
    const { data } = await apiClient.get<NotificationDto>(`/api/notifications/${id}/`);
    const [item] = await hydrateNotificationUsers([mapNotificationDtoToModel(data)]);
    return item ?? null;
  },

  async markAsRead(id) {
    return apiNotificationService.markNotificationRead(id);
  },

  async markNotificationRead(id) {
    const { data } = await apiClient.post<NotificationDto>(
      `/api/notifications/${id}/mark_read/`,
    );
    const [item] = await hydrateNotificationUsers([mapNotificationDtoToModel(data)]);
    return item ?? null;
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
