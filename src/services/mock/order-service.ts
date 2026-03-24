import { toCustomerSummary, toLeadSummary, toProductSummary } from '../../mock';
import type {
  EntityId,
  Order,
  OrderItem,
  OrderItemMutationInput,
  OrderMutationInput,
  OrderPatchInput,
  OrderSource,
} from '../../types/domain';
import { DEFAULT_CURRENCY_CODE } from '../../constants';
import type { OrderService } from '../core/contracts';
import { mockDataStore } from './dataset';
import { filterItemsBySearch, findById, paginateItems, withMockDelay } from './helpers';

type OrderOrderingField = 'created_at' | 'updated_at' | 'total_amount';

const ALLOWED_ORDER_SOURCES: readonly OrderSource[] = [
  'telegram',
  'instagram',
  'manual',
];

function resolveOrdering(params?: Parameters<OrderService['list']>[0]): {
  field: OrderOrderingField;
  direction: 'asc' | 'desc';
} {
  const requestedOrdering = params?.ordering?.trim();
  if (requestedOrdering) {
    const direction = requestedOrdering.startsWith('-') ? 'desc' : 'asc';
    const field = requestedOrdering.replace('-', '');

    if (
      field === 'created_at' ||
      field === 'updated_at' ||
      field === 'total_amount'
    ) {
      return { field, direction };
    }
  }

  const sortBy = params?.sortBy;
  const sortDirection = params?.sortDirection === 'asc' ? 'asc' : 'desc';

  if (sortBy === 'created_at' || sortBy === 'createdAt') {
    return { field: 'created_at', direction: sortDirection };
  }

  if (sortBy === 'updated_at' || sortBy === 'updatedAt') {
    return { field: 'updated_at', direction: sortDirection };
  }

  if (sortBy === 'total_amount' || sortBy === 'totalAmount') {
    return { field: 'total_amount', direction: sortDirection };
  }

  return { field: 'updated_at', direction: 'desc' };
}

function isAllowedSource(source: string): source is OrderSource {
  return ALLOWED_ORDER_SOURCES.includes(source as OrderSource);
}

function normalizeSource(source: string): OrderSource {
  const normalized = source.trim() as OrderSource;
  if (!isAllowedSource(normalized)) {
    throw new Error('Invalid order source.');
  }

  return normalized;
}

function derivePaymentStatus(status: Order['status']): NonNullable<Order['paymentStatus']> {
  switch (status) {
    case 'draft':
      return 'unpaid';
    case 'waiting_payment':
    case 'pending':
      return 'pending';
    case 'confirmed':
    case 'paid':
    case 'completed':
      return 'paid';
    case 'cancelled':
    default:
      return 'failed';
  }
}

function sanitizeItemInput(item: OrderItemMutationInput): OrderItemMutationInput {
  return {
    productId: item.productId,
    quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
    unitPrice: Number(Number(item.unitPrice || 0).toFixed(2)),
  };
}

function buildOrderItems(items: OrderItemMutationInput[], orderIdSeed: string): OrderItem[] {
  if (!items.length) {
    throw new Error('Order must include at least one item.');
  }

  return items.map((rawItem, index) => {
    const item = sanitizeItemInput(rawItem);
    const product = mockDataStore.products.find((entry) => entry.id === item.productId);

    if (!product) {
      throw new Error('Selected product does not exist.');
    }

    const lineTotal = Number((item.quantity * item.unitPrice).toFixed(2));

    return {
      id: `${orderIdSeed}-item-${String(index + 1).padStart(2, '0')}`,
      product: toProductSummary(product),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal,
      totalPrice: lineTotal,
    };
  });
}

function calculateTotalAmount(items: OrderItem[]): number {
  return Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
}

function resolveCustomer(customerId: EntityId | undefined) {
  if (!customerId) {
    return undefined;
  }

  const customer = mockDataStore.customers.find((entry) => entry.id === customerId);
  return customer ? toCustomerSummary(customer) : undefined;
}

function resolveLead(leadId: EntityId | undefined) {
  if (!leadId) {
    return undefined;
  }

  const lead = mockDataStore.leads.find((entry) => entry.id === leadId);
  return lead ? toLeadSummary(lead) : undefined;
}

function normalizeMutationInput(input: OrderMutationInput): OrderMutationInput {
  return {
    ...input,
    source: normalizeSource(input.source),
    contactName: input.contactName.trim(),
    contactPhone: input.contactPhone.trim(),
    shippingAddress: input.shippingAddress.trim(),
    notes: input.notes.trim(),
    aiGenerated: Boolean(input.aiGenerated),
    items: input.items.map((item) => sanitizeItemInput(item)),
  };
}

function compareOrders(left: Order, right: Order, field: OrderOrderingField): number {
  if (field === 'total_amount') {
    return left.totalAmount - right.totalAmount;
  }

  const leftValue = field === 'created_at' ? left.createdAt : left.updatedAt;
  const rightValue = field === 'created_at' ? right.createdAt : right.updatedAt;
  return new Date(leftValue).getTime() - new Date(rightValue).getTime();
}

export const mockOrderService: OrderService = {
  async list(params) {
    const statusFilter = params?.status;
    const sourceFilter = params?.source;
    const aiGeneratedFilter = params?.aiGenerated ?? params?.ai_generated;
    const { field, direction } = resolveOrdering(params);

    const searchedItems = filterItemsBySearch(
      mockDataStore.orders,
      params?.search,
      (order) =>
        [
          order.id,
          order.orderNumber,
          order.contactName,
          order.contactPhone,
          order.shippingAddress,
          order.customer?.fullName,
        ]
          .filter(Boolean)
          .join(' '),
    );

    const filteredItems = searchedItems.filter((order) => {
      const matchesStatus = !statusFilter || order.status === statusFilter;
      const matchesSource = !sourceFilter || order.source === sourceFilter;
      const matchesAiGenerated =
        typeof aiGeneratedFilter !== 'boolean' || order.aiGenerated === aiGeneratedFilter;

      return matchesStatus && matchesSource && matchesAiGenerated;
    });

    const sortedItems = [...filteredItems].sort((left, right) => {
      const compared = compareOrders(left, right, field);
      if (compared === 0) {
        return right.id.localeCompare(left.id);
      }

      return direction === 'asc' ? compared : -compared;
    });

    return withMockDelay(paginateItems(sortedItems, params), 220);
  },

  async getById(id) {
    return withMockDelay(findById(mockDataStore.orders, id), 170);
  },

  async create(input) {
    const payload = normalizeMutationInput(input);
    if (!payload.contactName || !payload.contactPhone || !payload.shippingAddress) {
      throw new Error('Required fields are missing.');
    }

    const now = new Date().toISOString();
    const baseId = `order-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const items = buildOrderItems(payload.items, baseId);
    const totalAmount = calculateTotalAmount(items);
    const status = payload.status;
    const orderNumber = `ORD-${String(1000 + mockDataStore.orders.length + 1).padStart(4, '0')}`;

    const nextOrder: Order = {
      id: baseId,
      customer: resolveCustomer(payload.customerId),
      lead: resolveLead(payload.leadId),
      status,
      source: payload.source,
      contactName: payload.contactName,
      contactPhone: payload.contactPhone,
      shippingAddress: payload.shippingAddress,
      notes: payload.notes || undefined,
      metadata: payload.metadata,
      aiGenerated: payload.aiGenerated,
      totalAmount,
      currency:
        payload.currency ?? items[0]?.product.currency ?? DEFAULT_CURRENCY_CODE,
      items,
      orderNumber,
      orderStatus: status,
      paymentStatus: derivePaymentStatus(status),
      notesSummary: payload.notes || undefined,
      createdAt: now,
      updatedAt: now,
    };

    mockDataStore.orders.unshift(nextOrder);
    return withMockDelay(nextOrder, 200);
  },

  async update(id, input) {
    const index = mockDataStore.orders.findIndex((entry) => entry.id === id);
    if (index < 0) {
      return withMockDelay(null, 150);
    }

    const payload = normalizeMutationInput(input);
    if (!payload.contactName || !payload.contactPhone || !payload.shippingAddress) {
      throw new Error('Required fields are missing.');
    }

    const existing = mockDataStore.orders[index]!;
    const items = buildOrderItems(payload.items, id);
    const totalAmount = calculateTotalAmount(items);
    const status = payload.status;
    const nextOrder: Order = {
      ...existing,
      customer: resolveCustomer(payload.customerId),
      lead: resolveLead(payload.leadId),
      status,
      source: payload.source,
      contactName: payload.contactName,
      contactPhone: payload.contactPhone,
      shippingAddress: payload.shippingAddress,
      notes: payload.notes || undefined,
      metadata: payload.metadata,
      aiGenerated: payload.aiGenerated,
      totalAmount,
      currency: payload.currency ?? existing.currency,
      items,
      orderStatus: status,
      paymentStatus: derivePaymentStatus(status),
      notesSummary: payload.notes || undefined,
      updatedAt: new Date().toISOString(),
    };

    mockDataStore.orders.splice(index, 1, nextOrder);
    return withMockDelay(nextOrder, 180);
  },

  async patch(id, input) {
    const existing = mockDataStore.orders.find((entry) => entry.id === id);
    if (!existing) {
      return withMockDelay(null, 150);
    }

    const patchPayload: OrderMutationInput = {
      customerId: input.customerId ?? existing.customer?.id,
      leadId: input.leadId ?? existing.lead?.id,
      status: input.status ?? existing.status,
      source: input.source ?? existing.source,
      contactName: input.contactName ?? existing.contactName,
      contactPhone: input.contactPhone ?? existing.contactPhone,
      shippingAddress: input.shippingAddress ?? existing.shippingAddress,
      notes: input.notes ?? existing.notes ?? '',
      metadata: input.metadata ?? existing.metadata,
      aiGenerated: input.aiGenerated ?? existing.aiGenerated,
      items:
        input.items ??
        existing.items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      currency: input.currency ?? existing.currency,
    };

    return this.update(id, patchPayload);
  },

  async delete(id) {
    const index = mockDataStore.orders.findIndex((entry) => entry.id === id);
    if (index < 0) {
      return withMockDelay(false, 120);
    }

    mockDataStore.orders.splice(index, 1);
    return withMockDelay(true, 140);
  },

  async recalculate(id) {
    const index = mockDataStore.orders.findIndex((entry) => entry.id === id);
    if (index < 0) {
      return withMockDelay(null, 150);
    }

    const existing = mockDataStore.orders[index]!;
    const items = existing.items.map((item) => {
      const lineTotal = Number((item.quantity * item.unitPrice).toFixed(2));
      return {
        ...item,
        lineTotal,
        totalPrice: lineTotal,
      };
    });
    const totalAmount = calculateTotalAmount(items);
    const nextOrder: Order = {
      ...existing,
      items,
      totalAmount,
      updatedAt: new Date().toISOString(),
    };

    mockDataStore.orders.splice(index, 1, nextOrder);
    return withMockDelay(nextOrder, 170);
  },
};
