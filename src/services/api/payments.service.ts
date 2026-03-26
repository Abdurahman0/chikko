import { apiClient } from '../../lib/api-client';
import type {
  EntityId,
  PaginatedResult,
  Payment,
  PaymentListParams,
  PaymentMutationInput,
  PaymentUpdateInput,
} from '../../types/domain';
import {
  mapPaymentDtoToModel,
  mapPaymentListDtoToItems,
  type PaymentDto,
} from '../adapters/payments.adapter';
import type { PaymentService } from '../core/contracts';

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

function toPaginatedResult(
  allItems: Payment[],
  params?: PaymentListParams,
  totalItemsHint?: number | null,
): PaginatedResult<Payment> {
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

function toMutationPayload(
  input: PaymentMutationInput | PaymentUpdateInput,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (input.amount !== undefined) {
    payload.amount = Number(input.amount);
  }
  if (input.method !== undefined) {
    payload.method = input.method;
  }
  if (input.screenshot !== undefined) {
    payload.screenshot = input.screenshot;
  }
  if (input.last_four_digits !== undefined) {
    payload.last_four_digits = input.last_four_digits;
  }
  if (input.submitted_by_name !== undefined) {
    payload.submitted_by_name = input.submitted_by_name;
  }
  if (input.metadata !== undefined) {
    payload.metadata = input.metadata;
  }
  if (input.verification_reference !== undefined) {
    payload.verification_reference = input.verification_reference;
  }
  if (input.order !== undefined) {
    payload.order = input.order;
  }

  return payload;
}

function extractPaymentDto(value: unknown): PaymentDto | null {
  const payload = toRecord(value);
  if (!payload) {
    return null;
  }

  const nestedPayment = toRecord(payload.payment);
  if (nestedPayment) {
    return nestedPayment;
  }

  const nestedResult = toRecord(payload.result);
  if (nestedResult) {
    return nestedResult;
  }

  const nestedData = toRecord(payload.data);
  if (nestedData) {
    return nestedData;
  }

  return payload;
}

function mapSinglePayment(value: unknown, fallbackId?: EntityId): Payment | null {
  const dto = extractPaymentDto(value);
  if (!dto) {
    return null;
  }

  const dtoId =
    typeof dto.id === 'string' && dto.id.trim().length > 0 ? dto.id : null;

  return mapPaymentDtoToModel(dtoId || !fallbackId ? dto : { ...dto, id: fallbackId });
}

export async function listPayments(
  params?: PaymentListParams,
): Promise<PaginatedResult<Payment>> {
  const { data } = await apiClient.get<unknown>('/api/payments/', {
    params: {
      page: params?.page,
      page_size: params?.pageSize,
      search: params?.search,
      status: params?.status,
      method: params?.method,
      order: params?.order,
      ordering:
        params?.ordering ??
        (params?.sortBy
          ? `${params.sortDirection === 'desc' ? '-' : ''}${params.sortBy}`
          : undefined),
    },
  });

  const items = mapPaymentListDtoToItems(data);
  const payload = toRecord(data);
  const totalItemsHint = readNumber(payload?.count);

  return toPaginatedResult(items, params, totalItemsHint);
}

export async function getPaymentById(id: EntityId): Promise<Payment | null> {
  const { data } = await apiClient.get<unknown>(`/api/payments/${id}/`);
  return mapSinglePayment(data, id);
}

export async function createPayment(input: PaymentMutationInput): Promise<Payment> {
  const { data } = await apiClient.post<unknown>(
    '/api/payments/',
    toMutationPayload(input),
  );

  const mapped = mapSinglePayment(data);
  if (!mapped) {
    throw new Error('Failed to create payment: invalid API response.');
  }

  return mapped;
}

export async function updatePayment(
  id: EntityId,
  input: PaymentUpdateInput,
): Promise<Payment | null> {
  const { data } = await apiClient.put<unknown>(
    `/api/payments/${id}/`,
    toMutationPayload(input),
  );

  return mapSinglePayment(data, id);
}

export async function patchPayment(
  id: EntityId,
  input: PaymentUpdateInput,
): Promise<Payment | null> {
  const { data } = await apiClient.patch<unknown>(
    `/api/payments/${id}/`,
    toMutationPayload(input),
  );

  return mapSinglePayment(data, id);
}

export async function deletePayment(id: EntityId): Promise<boolean> {
  await apiClient.delete(`/api/payments/${id}/`);
  return true;
}

export async function approvePayment(id: EntityId): Promise<Payment | null> {
  const { data } = await apiClient.post<unknown>(`/api/payments/${id}/approve/`, {});
  const mapped = mapSinglePayment(data, id);
  if (mapped) {
    return mapped;
  }

  return getPaymentById(id);
}

export async function rejectPayment(id: EntityId): Promise<Payment | null> {
  const { data } = await apiClient.post<unknown>(`/api/payments/${id}/reject/`, {});
  const mapped = mapSinglePayment(data, id);
  if (mapped) {
    return mapped;
  }

  return getPaymentById(id);
}

export async function verifyPayment(id: EntityId): Promise<Payment | null> {
  const { data } = await apiClient.post<unknown>(`/api/payments/${id}/verify/`, {});
  const mapped = mapSinglePayment(data, id);
  if (mapped) {
    return mapped;
  }

  return getPaymentById(id);
}

export const apiPaymentService: PaymentService = {
  async list(params) {
    return listPayments(params);
  },

  async getById(id) {
    return getPaymentById(id);
  },

  async listPayments(params) {
    return listPayments(params);
  },

  async getPaymentById(id) {
    return getPaymentById(id);
  },

  async createPayment(input) {
    return createPayment(input);
  },

  async updatePayment(id, input) {
    return updatePayment(id, input);
  },

  async patchPayment(id, input) {
    return patchPayment(id, input);
  },

  async deletePayment(id) {
    return deletePayment(id);
  },

  async approvePayment(id) {
    return approvePayment(id);
  },

  async rejectPayment(id) {
    return rejectPayment(id);
  },

  async verifyPayment(id) {
    return verifyPayment(id);
  },
};
