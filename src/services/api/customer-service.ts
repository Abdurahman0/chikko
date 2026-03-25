import type { CustomerService } from '../core/contracts';
import type {
  Customer,
  CustomerMutationInput,
  CustomerPatchInput,
  EntityId,
  PaginatedResult,
  TableQueryParams,
} from '../../types/domain';
import { apiClient } from '../../lib/api-client';
import {
  mapCustomerDtoToModel,
  mapCustomerListDtoToItems,
  type CustomerDto,
} from '../adapters/customer-adapter';

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
  allItems: Customer[],
  params?: TableQueryParams,
  totalItemsHint?: number | null,
): PaginatedResult<Customer> {
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

function normalizePayload(
  input: CustomerMutationInput | CustomerPatchInput,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (input.full_name !== undefined) {
    payload.full_name = input.full_name;
  }
  if (input.phone !== undefined) {
    payload.phone = input.phone;
  }
  if (input.email !== undefined) {
    payload.email = input.email;
  }
  if (input.address !== undefined) {
    payload.address = input.address;
  }
  if (input.notes !== undefined) {
    payload.notes = input.notes;
  }
  if (input.metadata !== undefined) {
    payload.metadata = input.metadata;
  }
  if (input.lead !== undefined) {
    payload.lead = input.lead;
  }
  if (input.assigned_operator !== undefined) {
    payload.assigned_operator = input.assigned_operator;
  }

  return payload;
}

export const apiCustomerService: CustomerService = {
  async list(params) {
    return apiCustomerService.listCustomers(params);
  },

  async getById(id) {
    return apiCustomerService.getCustomerById(id);
  },

  async listCustomers(params) {
    const { data } = await apiClient.get<unknown>('/api/customers/', {
      params: {
        page: params?.page,
        page_size: params?.pageSize,
        search: params?.search,
        assigned_operator: params?.assignedOperator ?? params?.assigned_operator,
        ordering:
          params?.ordering ??
          (params?.sortBy
            ? `${params.sortDirection === 'desc' ? '-' : ''}${params.sortBy}`
            : undefined),
      },
    });

    const items = mapCustomerListDtoToItems(data);
    const payload =
      data && typeof data === 'object' && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : null;
    const totalItemsHint = readNumber(payload?.count);

    return toPaginatedResult(items, params, totalItemsHint);
  },

  async getCustomerById(id) {
    const { data } = await apiClient.get<CustomerDto>(`/api/customers/${id}/`);
    return mapCustomerDtoToModel(data);
  },

  async createCustomer(input) {
    const { data } = await apiClient.post<CustomerDto>('/api/customers/', normalizePayload(input));
    return mapCustomerDtoToModel(data);
  },

  async updateCustomer(id, input) {
    const { data } = await apiClient.put<CustomerDto>(
      `/api/customers/${id}/`,
      normalizePayload(input),
    );
    return mapCustomerDtoToModel(data);
  },

  async patchCustomer(id, input) {
    const { data } = await apiClient.patch<CustomerDto>(
      `/api/customers/${id}/`,
      normalizePayload(input),
    );
    return mapCustomerDtoToModel(data);
  },

  async deleteCustomer(id: EntityId) {
    await apiClient.delete(`/api/customers/${id}/`);
    return true;
  },
};
