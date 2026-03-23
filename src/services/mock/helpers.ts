import { DEFAULT_PAGE_SIZE } from '../../constants';
import type { EntityId, PaginatedResult, TableQueryParams } from '../../types/domain';

export async function withMockDelay<T>(
  value: T,
  delayMs = 180,
): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return value;
}

export function paginateItems<T>(
  items: T[],
  params?: TableQueryParams,
): PaginatedResult<T> {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? DEFAULT_PAGE_SIZE;
  const startIndex = (page - 1) * pageSize;
  const pagedItems = items.slice(startIndex, startIndex + pageSize);

  return {
    items: pagedItems,
    meta: {
      page,
      pageSize,
      totalItems: items.length,
      totalPages: Math.ceil(items.length / pageSize) || 1,
    },
  };
}

export function filterItemsBySearch<T>(
  items: T[],
  search: string | undefined,
  getSearchValue: (item: T) => string,
): T[] {
  if (!search?.trim()) {
    return items;
  }

  const normalizedSearch = search.trim().toLowerCase();

  return items.filter((item) =>
    getSearchValue(item).toLowerCase().includes(normalizedSearch),
  );
}

export function findById<T extends { id: EntityId }>(
  items: T[],
  id: EntityId,
): T | null {
  return items.find((item) => item.id === id) ?? null;
}
