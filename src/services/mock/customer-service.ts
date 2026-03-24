import { toLeadSummary, toUserSummary } from '../../mock';
import type {
  Customer,
  CustomerMutationInput,
} from '../../types/domain';
import { DEFAULT_CURRENCY_CODE } from '../../constants';
import type { CustomerService } from '../core/contracts';
import { mockDataStore } from './dataset';
import { filterItemsBySearch, findById, paginateItems, withMockDelay } from './helpers';

type CustomerOrderingField = 'created_at' | 'updated_at';

function getOrderingConfig(params?: Parameters<CustomerService['list']>[0]): {
  field: CustomerOrderingField;
  direction: 'asc' | 'desc';
} {
  const requestedOrdering = params?.ordering?.trim();

  if (requestedOrdering) {
    const isDescending = requestedOrdering.startsWith('-');
    const rawField = requestedOrdering.replace(/^-/, '');

    if (rawField === 'created_at' || rawField === 'updated_at') {
      return {
        field: rawField,
        direction: isDescending ? 'desc' : 'asc',
      };
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

  return { field: 'updated_at', direction: 'desc' };
}

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
}

function deriveUsername(fullName: string, email: string | null): string | undefined {
  if (email && email.includes('@')) {
    return email.split('@')[0]?.toLowerCase() ?? undefined;
  }

  const fromName = fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_');

  return fromName || undefined;
}

function normalizeMutationInput(input: CustomerMutationInput) {
  const fullName = input.full_name.trim();
  const phone = input.phone.trim();
  if (!fullName || !phone) {
    throw new Error('Required customer fields are missing.');
  }

  const email = normalizeText(input.email);
  const address = normalizeText(input.address);
  const notes = normalizeText(input.notes);
  const username = deriveUsername(fullName, email);
  const linkedLead = input.lead
    ? mockDataStore.leads.find((lead) => lead.id === input.lead)
    : undefined;
  const assignedOperator = input.assigned_operator
    ? mockDataStore.operators.find(
        (operator) => operator.id === input.assigned_operator,
      )
    : undefined;

  return {
    fullName,
    phone,
    email,
    address,
    notes,
    metadata: input.metadata ?? null,
    username,
    lead: linkedLead ? toLeadSummary(linkedLead) : undefined,
    assignedOperator: assignedOperator ? toUserSummary(assignedOperator) : undefined,
  };
}

function resolvePatchInput(
  existing: Customer,
  input: Parameters<CustomerService['patchCustomer']>[1],
): CustomerMutationInput {
  return {
    full_name: input.full_name ?? existing.fullName,
    phone: input.phone ?? existing.contact.phone ?? '',
    email: input.email ?? existing.contact.email ?? null,
    address: input.address ?? existing.address?.line1 ?? null,
    notes: input.notes ?? existing.notes ?? null,
    metadata: input.metadata ?? existing.metadata ?? null,
    lead: input.lead ?? existing.lead?.id ?? null,
    assigned_operator:
      input.assigned_operator ?? existing.assignedOperator?.id ?? null,
  };
}

export const mockCustomerService: CustomerService = {
  async list(params) {
    const assignedOperatorFilter =
      params?.assignedOperator ?? params?.assigned_operator;
    const { field: orderingField, direction: orderingDirection } =
      getOrderingConfig(params);

    const searchedItems = filterItemsBySearch(
      mockDataStore.customers,
      params?.search,
      (customer) =>
        [
          customer.fullName,
          customer.contact.phone,
          customer.contact.email,
          customer.address?.line1,
          customer.address?.city,
          customer.address?.region,
          customer.address?.country,
          customer.notes,
          customer.assignedOperator?.fullName,
        ]
          .filter(Boolean)
          .join(' '),
    );

    const filteredItems = assignedOperatorFilter
      ? searchedItems.filter(
          (customer) => customer.assignedOperator?.id === assignedOperatorFilter,
        )
      : searchedItems;

    const sortedItems = [...filteredItems].sort((left, right) => {
      const leftValue =
        orderingField === 'created_at' ? left.createdAt : left.updatedAt;
      const rightValue =
        orderingField === 'created_at' ? right.createdAt : right.updatedAt;
      const leftTime = new Date(leftValue).getTime();
      const rightTime = new Date(rightValue).getTime();

      if (leftTime === rightTime) {
        return left.fullName.localeCompare(right.fullName);
      }

      return orderingDirection === 'asc'
        ? leftTime - rightTime
        : rightTime - leftTime;
    });

    return withMockDelay(paginateItems(sortedItems, params), 200);
  },

  async getById(id) {
    return withMockDelay(findById(mockDataStore.customers, id), 150);
  },

  async listCustomers(params) {
    return this.list(params);
  },

  async getCustomerById(id) {
    return this.getById(id);
  },

  async createCustomer(input) {
    const payload = normalizeMutationInput(input);
    const now = new Date().toISOString();

    const nextCustomer: Customer = {
      id: `customer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      fullName: payload.fullName,
      username: payload.username,
      contact: {
        phone: payload.phone,
        email: payload.email ?? undefined,
        username: payload.username,
      },
      address: payload.address
        ? {
            line1: payload.address,
            country: "O'zbekiston",
          }
        : undefined,
      notes: payload.notes ?? undefined,
      notesSummary: payload.notes ?? undefined,
      metadata: payload.metadata,
      lead: payload.lead,
      assignedOperator: payload.assignedOperator,
      segments: [],
      totalOrders: 0,
      totalSpent: 0,
      currency: DEFAULT_CURRENCY_CODE,
      createdAt: now,
      updatedAt: now,
    };

    mockDataStore.customers.unshift(nextCustomer);
    return withMockDelay(nextCustomer, 170);
  },

  async updateCustomer(id, input) {
    const index = mockDataStore.customers.findIndex((customer) => customer.id === id);
    if (index < 0) {
      return withMockDelay(null, 140);
    }

    const payload = normalizeMutationInput(input);
    const existing = mockDataStore.customers[index]!;
    const now = new Date().toISOString();

    const nextCustomer: Customer = {
      ...existing,
      fullName: payload.fullName,
      username: payload.username ?? existing.username,
      contact: {
        ...existing.contact,
        phone: payload.phone,
        email: payload.email ?? undefined,
        username: payload.username ?? existing.contact.username,
      },
      address: payload.address
        ? {
            line1: payload.address,
            city: existing.address?.city,
            region: existing.address?.region,
            postalCode: existing.address?.postalCode,
            country: existing.address?.country ?? "O'zbekiston",
          }
        : undefined,
      notes: payload.notes ?? undefined,
      notesSummary: payload.notes ?? undefined,
      metadata: payload.metadata,
      lead: payload.lead,
      assignedOperator: payload.assignedOperator,
      updatedAt: now,
    };

    mockDataStore.customers.splice(index, 1, nextCustomer);
    return withMockDelay(nextCustomer, 170);
  },

  async patchCustomer(id, input) {
    const existing = mockDataStore.customers.find((customer) => customer.id === id);
    if (!existing) {
      return withMockDelay(null, 140);
    }

    const fullPayload = resolvePatchInput(existing, input);
    return this.updateCustomer(id, fullPayload);
  },

  async deleteCustomer(id) {
    const index = mockDataStore.customers.findIndex((customer) => customer.id === id);
    if (index < 0) {
      return withMockDelay(false, 120);
    }

    mockDataStore.customers.splice(index, 1);
    return withMockDelay(true, 130);
  },
};
