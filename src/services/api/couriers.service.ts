import { apiClient } from '../../lib/api-client';
import type {
  Courier,
  CourierListParams,
  CourierMutationInput,
  CourierOrder,
  CourierOrderListParams,
  CourierOrderMutationInput,
  CourierOrderPatchInput,
  CourierPatchInput,
  EntityId,
  PaginatedResult,
} from '../../types/domain';
import {
  mapCourierDtoToModel,
  mapCourierListDtoToItems,
  mapCourierOrderDtoToModel,
  mapCourierOrderListDtoToItems,
  type CourierDto,
  type CourierOrderDto,
} from '../adapters/couriers.adapter';
import type { CourierService } from '../core/contracts';

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

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

function extractDto<T extends Record<string, unknown>>(
  value: unknown,
  nestedKey: string,
): T | null {
  const payload = toRecord(value);
  if (!payload) {
    return null;
  }

  const nested = toRecord(payload[nestedKey]);
  if (nested) {
    return nested as T;
  }

  const nestedResult = toRecord(payload.result);
  if (nestedResult) {
    return nestedResult as T;
  }

  const nestedData = toRecord(payload.data);
  if (nestedData) {
    return nestedData as T;
  }

  return payload as T;
}

function toPaginatedResult<T>(
  allItems: T[],
  page: number,
  pageSize: number,
  totalItemsHint?: number | null,
): PaginatedResult<T> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const start = (safePage - 1) * safePageSize;
  const hasServerPaginationHint =
    typeof totalItemsHint === 'number' && totalItemsHint >= 0;

  const items = hasServerPaginationHint
    ? allItems
    : allItems.slice(start, start + safePageSize);
  const totalItems = hasServerPaginationHint ? totalItemsHint : allItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));

  return {
    items,
    meta: {
      page: Math.min(safePage, totalPages),
      pageSize: safePageSize,
      totalItems,
      totalPages,
    },
  };
}

function toMetadataPayload(
  metadata: CourierMutationInput['metadata'] | CourierOrderMutationInput['metadata'],
): Record<string, unknown> {
  if (!metadata) {
    return {};
  }

  return Object.fromEntries(Object.entries(metadata));
}

function toCourierPayload(
  input: CourierMutationInput | CourierPatchInput,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (input.telegramUserId !== undefined) {
    payload.telegram_user_id = input.telegramUserId;
  }

  if (input.firstName !== undefined) {
    payload.first_name = input.firstName;
  }

  if (input.username !== undefined) {
    payload.username = input.username;
  }

  if (input.phone !== undefined) {
    payload.phone = input.phone;
  }

  if (input.isActive !== undefined) {
    payload.is_active = input.isActive;
  }

  if (input.metadata !== undefined) {
    payload.metadata = toMetadataPayload(input.metadata);
  }

  return payload;
}

function toCourierOrderPayload(
  input: CourierOrderMutationInput | CourierOrderPatchInput,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (input.order !== undefined) {
    payload.order = input.order;
  }

  if (input.status !== undefined) {
    payload.status = input.status;
  }

  if (input.awaitingCancelReason !== undefined) {
    payload.awaiting_cancel_reason = input.awaitingCancelReason;
  }

  if (input.cancelReason !== undefined) {
    payload.cancel_reason = input.cancelReason;
  }

  if (input.metadata !== undefined) {
    payload.metadata = toMetadataPayload(input.metadata);
  }

  return payload;
}

function mapSingleCourier(value: unknown, fallbackId?: EntityId): Courier | null {
  const dto = extractDto<CourierDto>(value, 'courier');
  if (!dto) {
    return null;
  }

  const dtoId = typeof dto.id === 'string' && dto.id.trim() ? dto.id : null;
  return mapCourierDtoToModel(dtoId || !fallbackId ? dto : { ...dto, id: fallbackId });
}

function mapSingleCourierOrder(
  value: unknown,
  fallbackId?: EntityId,
): CourierOrder | null {
  const dto = extractDto<CourierOrderDto>(value, 'courier_order');
  if (!dto) {
    return null;
  }

  const dtoId = typeof dto.id === 'string' && dto.id.trim() ? dto.id : null;
  return mapCourierOrderDtoToModel(dtoId || !fallbackId ? dto : { ...dto, id: fallbackId });
}

export async function listCouriers(
  params?: CourierListParams,
): Promise<PaginatedResult<Courier>> {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.max(1, params?.pageSize ?? 10);

  const { data } = await apiClient.get<unknown>('/api/couriers/couriers/', {
    params: {
      page,
      page_size: pageSize,
      search: params?.search,
      is_active: params?.is_active,
      ordering: params?.ordering,
    },
  });

  const items = mapCourierListDtoToItems(data);
  const payload = toRecord(data);
  const totalItemsHint = readNumber(payload?.count);

  return toPaginatedResult(items, page, pageSize, totalItemsHint);
}

export async function getCourierById(id: EntityId): Promise<Courier | null> {
  const { data } = await apiClient.get<unknown>(`/api/couriers/couriers/${id}/`);
  return mapSingleCourier(data, id);
}

export async function createCourier(input: CourierMutationInput): Promise<Courier> {
  const { data } = await apiClient.post<unknown>(
    '/api/couriers/couriers/',
    toCourierPayload(input),
  );

  const mapped = mapSingleCourier(data);
  if (!mapped) {
    throw new Error('Failed to create courier: invalid API response.');
  }

  return mapped;
}

export async function updateCourier(
  id: EntityId,
  input: CourierMutationInput,
): Promise<Courier | null> {
  const { data } = await apiClient.put<unknown>(
    `/api/couriers/couriers/${id}/`,
    toCourierPayload(input),
  );

  return mapSingleCourier(data, id);
}

export async function patchCourier(
  id: EntityId,
  input: CourierPatchInput,
): Promise<Courier | null> {
  const { data } = await apiClient.patch<unknown>(
    `/api/couriers/couriers/${id}/`,
    toCourierPayload(input),
  );

  return mapSingleCourier(data, id);
}

export async function deleteCourier(id: EntityId): Promise<boolean> {
  await apiClient.delete(`/api/couriers/couriers/${id}/`);
  return true;
}

export async function listCourierOrders(
  params?: CourierOrderListParams,
): Promise<PaginatedResult<CourierOrder>> {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.max(1, params?.pageSize ?? 10);

  const { data } = await apiClient.get<unknown>('/api/couriers/orders/', {
    params: {
      page,
      page_size: pageSize,
      search: params?.search,
      courier: params?.courier,
      status: params?.status,
      ordering: params?.ordering,
    },
  });

  const items = mapCourierOrderListDtoToItems(data);
  const payload = toRecord(data);
  const totalItemsHint = readNumber(payload?.count);

  return toPaginatedResult(items, page, pageSize, totalItemsHint);
}

export async function getCourierOrderById(
  id: EntityId,
): Promise<CourierOrder | null> {
  const { data } = await apiClient.get<unknown>(`/api/couriers/orders/${id}/`);
  return mapSingleCourierOrder(data, id);
}

export async function updateCourierOrder(
  id: EntityId,
  input: CourierOrderMutationInput,
): Promise<CourierOrder | null> {
  const { data } = await apiClient.put<unknown>(
    `/api/couriers/orders/${id}/`,
    toCourierOrderPayload(input),
  );

  return mapSingleCourierOrder(data, id);
}

export async function patchCourierOrder(
  id: EntityId,
  input: CourierOrderPatchInput,
): Promise<CourierOrder | null> {
  const { data } = await apiClient.patch<unknown>(
    `/api/couriers/orders/${id}/`,
    toCourierOrderPayload(input),
  );

  return mapSingleCourierOrder(data, id);
}

export async function repostCourierOrder(
  id: EntityId,
  input?: CourierOrderPatchInput,
): Promise<CourierOrder | null> {
  const { data } = await apiClient.post<unknown>(
    `/api/couriers/orders/${id}/repost/`,
    input ? toCourierOrderPayload(input) : {},
  );

  const mapped = mapSingleCourierOrder(data, id);
  if (mapped) {
    return mapped;
  }

  return getCourierOrderById(id);
}

export const apiCourierService: CourierService = {
  async list(params) {
    return listCouriers(params);
  },

  async getById(id) {
    return getCourierById(id);
  },

  async create(input) {
    return createCourier(input);
  },

  async update(id, input) {
    return updateCourier(id, input);
  },

  async patch(id, input) {
    return patchCourier(id, input);
  },

  async delete(id) {
    return deleteCourier(id);
  },

  async listOrders(params) {
    return listCourierOrders(params);
  },

  async getOrderById(id) {
    return getCourierOrderById(id);
  },

  async updateOrder(id, input) {
    return updateCourierOrder(id, input);
  },

  async patchOrder(id, input) {
    return patchCourierOrder(id, input);
  },

  async repostOrder(id, input) {
    return repostCourierOrder(id, input);
  },

  async listCouriers(params) {
    return listCouriers(params);
  },

  async getCourierById(id) {
    return getCourierById(id);
  },

  async createCourier(input) {
    return createCourier(input);
  },

  async updateCourier(id, input) {
    return updateCourier(id, input);
  },

  async patchCourier(id, input) {
    return patchCourier(id, input);
  },

  async deleteCourier(id) {
    return deleteCourier(id);
  },

  async listCourierOrders(params) {
    return listCourierOrders(params);
  },

  async getCourierOrderById(id) {
    return getCourierOrderById(id);
  },

  async updateCourierOrder(id, input) {
    return updateCourierOrder(id, input);
  },

  async patchCourierOrder(id, input) {
    return patchCourierOrder(id, input);
  },

  async repostCourierOrder(id, input) {
    return repostCourierOrder(id, input);
  },
};
