import type { LogsService } from '../core/contracts';
import type { AppLog, LogListParams } from '../../types/domain';
import { mockDataStore } from './dataset';
import { findById, paginateItems, withMockDelay } from './helpers';

type LogOrderingField = 'created_at' | 'type' | 'message';

function resolveOrdering(params?: LogListParams): {
  field: LogOrderingField;
  direction: 'asc' | 'desc';
} {
  const requestedOrdering = params?.ordering?.trim();
  if (requestedOrdering) {
    const direction = requestedOrdering.startsWith('-') ? 'desc' : 'asc';
    const field = requestedOrdering.replace('-', '');

    if (field === 'created_at' || field === 'type' || field === 'message') {
      return { field, direction };
    }
  }

  const sortBy = params?.sortBy?.trim();
  const sortDirection = params?.sortDirection === 'asc' ? 'asc' : 'desc';
  if (sortBy === 'createdAt' || sortBy === 'created_at' || sortBy === 'type' || sortBy === 'message') {
    const field = sortBy === 'createdAt' ? 'created_at' : (sortBy as LogOrderingField);
    return { field, direction: sortDirection };
  }

  return { field: 'created_at', direction: 'desc' };
}

function compareLogs(left: AppLog, right: AppLog, field: LogOrderingField): number {
  if (field === 'type') {
    return left.type.localeCompare(right.type);
  }

  if (field === 'message') {
    return left.message.localeCompare(right.message);
  }

  return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
}

export const mockLogsService: LogsService = {
  async listLogs(params) {
    const { field, direction } = resolveOrdering(params);
    const normalizedSearch = params?.search?.trim().toLowerCase();

    const filtered = mockDataStore.appLogs.filter((log) => {
      const matchesSearch = !normalizedSearch || log.message.toLowerCase().includes(normalizedSearch);
      const matchesType = !params?.type || log.type === params.type;
      return matchesSearch && matchesType;
    });

    const sorted = [...filtered].sort((left, right) => {
      const compared = compareLogs(left, right, field);
      if (compared === 0) {
        return right.id.localeCompare(left.id);
      }

      return direction === 'asc' ? compared : -compared;
    });

    return withMockDelay(paginateItems(sorted, params), 170);
  },

  async getLogById(id) {
    return withMockDelay(findById(mockDataStore.appLogs, id), 120);
  },
};
