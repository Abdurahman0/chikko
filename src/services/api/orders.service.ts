import { apiClient } from '../../lib/api-client';
import type {
  EntityId,
  Order,
  OrderItemMutationInput,
  OrderMutationInput,
  OrderPatchInput,
  PaginatedResult,
  TableQueryParams,
} from '../../types/domain';
import {
  mapOrderDtoToModel,
  mapOrderListDtoToItems,
  type OrderDto,
} from '../adapters/orders.adapter';
import type { OrderService } from '../core/contracts';

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

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function toPaginatedResult(
  allItems: Order[],
  params?: TableQueryParams,
  totalItemsHint?: number | null,
): PaginatedResult<Order> {
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

function normalizeItems(
  items: OrderItemMutationInput[] | undefined,
): Array<Record<string, unknown>> | undefined {
  if (!items) {
    return undefined;
  }

  const normalized = items
    .map((item) => {
      const productId = String(item.productId ?? '').trim();
      if (!isUuidLike(productId)) {
        return null;
      }

      return {
        product_id: productId,
        quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
        unit_price: Math.max(0, Number(Number(item.unitPrice || 0).toFixed(2))),
      };
    })
    .filter(
      (
        item,
      ): item is { product_id: string; quantity: number; unit_price: number } =>
        item !== null,
    );

  return normalized;
}

function toOrderPayload(
  input: OrderMutationInput | OrderPatchInput,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const normalizeText = (value: string | null | undefined): string =>
    typeof value === 'string' ? value : '';

  if (input.customerId !== undefined) {
    const customerId = String(input.customerId ?? '').trim();
    payload.customer = isUuidLike(customerId) ? customerId : null;
  }
  if (input.status !== undefined) {
    payload.status = input.status;
  }
  if (input.source !== undefined) {
    payload.source = input.source;
  }
  if (input.contactName !== undefined) {
    payload.contact_name = input.contactName;
  }
  if (input.contactPhone !== undefined) {
    payload.contact_phone = input.contactPhone;
  }
  if (input.shippingAddress !== undefined) {
    payload.shipping_address = input.shippingAddress;
  }
  if (input.notes !== undefined) {
    payload.notes = normalizeText(input.notes);
  }
  if (input.aiGenerated !== undefined) {
    payload.ai_generated = input.aiGenerated;
  }
  if (input.currency !== undefined) {
    payload.currency = input.currency;
  }

  const items = normalizeItems(input.items);
  if (items !== undefined) {
    payload.items = items;
  }

  return payload;
}

function extractOrderDto(value: unknown): OrderDto | null {
  const payload = toRecord(value);
  if (!payload) {
    return null;
  }

  const nestedOrder = toRecord(payload.order);
  if (nestedOrder) {
    return nestedOrder;
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

function mapSingleOrder(value: unknown, fallbackId?: EntityId): Order | null {
  const dto = extractOrderDto(value);
  if (!dto) {
    return null;
  }

  const dtoId =
    typeof dto.id === 'string' && dto.id.trim().length > 0 ? dto.id : null;
  return mapOrderDtoToModel(dtoId || !fallbackId ? dto : { ...dto, id: fallbackId });
}

export async function listOrders(params?: TableQueryParams): Promise<PaginatedResult<Order>> {
  const { data } = await apiClient.get<unknown>('/api/orders/', {
    params: {
      page: params?.page,
      page_size: params?.pageSize,
      search: params?.search,
      status: params?.status,
      source: params?.source,
      ai_generated: params?.aiGenerated ?? params?.ai_generated,
      ordering:
        params?.ordering ??
        (params?.sortBy
          ? `${params.sortDirection === 'desc' ? '-' : ''}${params.sortBy}`
          : undefined),
    },
  });

  const items = mapOrderListDtoToItems(data);
  const payload = toRecord(data);
  const totalItemsHint = readNumber(payload?.count);

  return toPaginatedResult(items, params, totalItemsHint);
}

export async function getOrderById(id: EntityId): Promise<Order | null> {
  const { data } = await apiClient.get<unknown>(`/api/orders/${id}/`);
  return mapSingleOrder(data);
}

export async function createOrder(payload: OrderMutationInput): Promise<Order> {
  const { data } = await apiClient.post<unknown>('/api/orders/', toOrderPayload(payload));
  const mapped = mapSingleOrder(data);

  if (!mapped) {
    throw new Error('Failed to create order: invalid API response.');
  }

  return mapped;
}

export async function updateOrder(
  id: EntityId,
  payload: OrderMutationInput,
): Promise<Order | null> {
  const { data } = await apiClient.put<unknown>(
    `/api/orders/${id}/`,
    toOrderPayload(payload),
  );

  return mapSingleOrder(data);
}

export async function patchOrder(
  id: EntityId,
  payload: OrderPatchInput,
): Promise<Order | null> {
  const { data } = await apiClient.patch<unknown>(
    `/api/orders/${id}/`,
    toOrderPayload(payload),
  );

  return mapSingleOrder(data);
}

export async function deleteOrder(id: EntityId): Promise<boolean> {
  await apiClient.delete(`/api/orders/${id}/`);
  return true;
}

export async function recalculateOrder(
  id: EntityId,
  payload?: OrderMutationInput | OrderPatchInput,
): Promise<Order | null> {
  const { data } = await apiClient.post<unknown>(
    `/api/orders/${id}/recalculate/`,
    payload ? toOrderPayload(payload) : {},
  );

  const mapped = mapSingleOrder(data, id);
  if (mapped) {
    return mapped;
  }

  return getOrderById(id);
}

export const apiOrderService: OrderService & {
  listOrders: typeof listOrders;
  getOrderById: typeof getOrderById;
  createOrder: typeof createOrder;
  updateOrder: typeof updateOrder;
  patchOrder: typeof patchOrder;
  deleteOrder: typeof deleteOrder;
  recalculateOrder: typeof recalculateOrder;
} = {
  async list(params) {
    return listOrders(params);
  },

  async getById(id) {
    return getOrderById(id);
  },

  async create(input) {
    return createOrder(input);
  },

  async update(id, input) {
    return updateOrder(id, input);
  },

  async patch(id, input) {
    return patchOrder(id, input);
  },

  async delete(id) {
    return deleteOrder(id);
  },

  async recalculate(id, input) {
    return recalculateOrder(id, input);
  },

  listOrders,
  getOrderById,
  createOrder,
  updateOrder,
  patchOrder,
  deleteOrder,
  recalculateOrder,
};
