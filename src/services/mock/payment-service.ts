import type {
  EntityId,
  Payment,
  PaymentListParams,
  PaymentMethod,
  PaymentMutationInput,
  PaymentStatus,
  PaymentUpdateInput,
} from '../../types/domain';
import { PAYMENT_METHODS, PAYMENT_STATUSES } from '../../constants';
import type { PaymentService } from '../core/contracts';
import { mockDataStore } from './dataset';
import { filterItemsBySearch, findById, paginateItems, withMockDelay } from './helpers';

type PaymentOrderingField = 'created_at' | 'updated_at' | 'amount';

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function sanitizeLastFourDigits(value: string | null | undefined): string | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }

  const digitsOnly = normalized.replace(/\D/g, '').slice(-4);
  if (digitsOnly.length !== 4) {
    throw new Error('Last 4 digits must contain exactly four numbers.');
  }

  return digitsOnly;
}

function sanitizeMetadata(input: PaymentMutationInput['metadata']): Payment['metadata'] {
  if (!input) {
    return null;
  }

  const keys = Object.keys(input);
  return keys.length ? input : null;
}

function resolveOrdering(params?: PaymentListParams): {
  field: PaymentOrderingField;
  direction: 'asc' | 'desc';
} {
  const requestedOrdering = params?.ordering?.trim();
  if (requestedOrdering) {
    const direction = requestedOrdering.startsWith('-') ? 'desc' : 'asc';
    const field = requestedOrdering.replace('-', '');

    if (field === 'created_at' || field === 'updated_at' || field === 'amount') {
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

  if (sortBy === 'amount') {
    return { field: 'amount', direction: sortDirection };
  }

  return { field: 'updated_at', direction: 'desc' };
}

function comparePayments(left: Payment, right: Payment, field: PaymentOrderingField): number {
  if (field === 'amount') {
    return left.amount - right.amount;
  }

  const leftValue = field === 'created_at' ? left.created_at : left.updated_at;
  const rightValue = field === 'created_at' ? right.created_at : right.updated_at;
  return new Date(leftValue).getTime() - new Date(rightValue).getTime();
}

function updateReviewState(
  payment: Payment,
  nextStatus: Extract<PaymentStatus, 'approved' | 'rejected' | 'verified'>,
): Payment {
  if (payment.status !== 'pending') {
    return payment;
  }

  const now = new Date().toISOString();
  return {
    ...payment,
    status: nextStatus,
    reviewed_at: now,
    reviewed_by: payment.reviewed_by ?? 'Operator Payments',
    updated_at: now,
  };
}

function assertPaymentMethod(method: string): asserts method is PaymentMethod {
  if (!PAYMENT_METHODS.includes(method as PaymentMethod)) {
    throw new Error('Invalid payment method.');
  }
}

function assertPaymentStatus(status: string): asserts status is PaymentStatus {
  if (!PAYMENT_STATUSES.includes(status as PaymentStatus)) {
    throw new Error('Invalid payment status.');
  }
}

export const mockPaymentService: PaymentService = {
  async list(params) {
    return mockPaymentService.listPayments(params);
  },

  async getById(id) {
    return mockPaymentService.getPaymentById(id);
  },

  async listPayments(params) {
    const statusFilter = params?.status;
    const methodFilter = params?.method;
    const orderFilter = params?.order?.trim();
    const { field, direction } = resolveOrdering(params);

    if (statusFilter) {
      assertPaymentStatus(statusFilter);
    }

    if (methodFilter) {
      assertPaymentMethod(methodFilter);
    }

    const searched = filterItemsBySearch(
      mockDataStore.payments,
      params?.search,
      (payment) =>
        [
          payment.submitted_by_name,
          payment.last_four_digits ?? '',
          payment.verification_reference ?? '',
        ].join(' '),
    );

    const filtered = searched.filter((payment) => {
      const matchesStatus = !statusFilter || payment.status === statusFilter;
      const matchesMethod = !methodFilter || payment.method === methodFilter;
      const matchesOrder = !orderFilter || payment.order === orderFilter;

      return matchesStatus && matchesMethod && matchesOrder;
    });

    const sorted = [...filtered].sort((left, right) => {
      const compared = comparePayments(left, right, field);
      if (compared === 0) {
        return right.id.localeCompare(left.id);
      }

      return direction === 'asc' ? compared : -compared;
    });

    return withMockDelay(paginateItems(sorted, params), 230);
  },

  async getPaymentById(id) {
    return withMockDelay(findById(mockDataStore.payments, id), 170);
  },

  async createPayment(input) {
    const amount = Number(input.amount);
    const method = input.method;
    const submittedByName = input.submitted_by_name.trim();
    const order = input.order.trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Amount must be a valid positive number.');
    }

    assertPaymentMethod(method);

    if (!submittedByName) {
      throw new Error('Submitted by name is required.');
    }

    if (!order) {
      throw new Error('Order is required.');
    }

    const now = new Date().toISOString();
    const nextPayment: Payment = {
      id: `payment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      created_at: now,
      updated_at: now,
      amount: Number(amount.toFixed(2)),
      status: 'pending',
      method,
      screenshot: normalizeOptionalString(input.screenshot),
      last_four_digits: sanitizeLastFourDigits(input.last_four_digits),
      submitted_by_name: submittedByName,
      reviewed_at: null,
      metadata: sanitizeMetadata(input.metadata),
      verification_reference: normalizeOptionalString(input.verification_reference),
      order,
      reviewed_by: null,
    };

    mockDataStore.payments.unshift(nextPayment);
    return withMockDelay(nextPayment, 190);
  },

  async updatePayment(id, input) {
    const index = mockDataStore.payments.findIndex((entry) => entry.id === id);
    if (index < 0) {
      return withMockDelay(null, 150);
    }

    const existing = mockDataStore.payments[index]!;
    const nextAmount =
      typeof input.amount === 'number' ? Number(input.amount) : existing.amount;

    if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
      throw new Error('Amount must be a valid positive number.');
    }

    if (typeof input.method === 'string') {
      assertPaymentMethod(input.method);
    }

    const submittedByName =
      typeof input.submitted_by_name === 'string'
        ? input.submitted_by_name.trim()
        : existing.submitted_by_name;

    if (!submittedByName) {
      throw new Error('Submitted by name is required.');
    }

    const order = typeof input.order === 'string' ? input.order.trim() : existing.order;
    if (!order) {
      throw new Error('Order is required.');
    }

    const nextPayment: Payment = {
      ...existing,
      amount: Number(nextAmount.toFixed(2)),
      method: input.method ?? existing.method,
      screenshot:
        input.screenshot !== undefined
          ? normalizeOptionalString(input.screenshot)
          : existing.screenshot,
      last_four_digits:
        input.last_four_digits !== undefined
          ? sanitizeLastFourDigits(input.last_four_digits)
          : existing.last_four_digits,
      submitted_by_name: submittedByName,
      metadata:
        input.metadata !== undefined ? sanitizeMetadata(input.metadata) : existing.metadata,
      verification_reference:
        input.verification_reference !== undefined
          ? normalizeOptionalString(input.verification_reference)
          : existing.verification_reference,
      order,
      updated_at: new Date().toISOString(),
    };

    mockDataStore.payments.splice(index, 1, nextPayment);
    return withMockDelay(nextPayment, 180);
  },

  async deletePayment(id) {
    const index = mockDataStore.payments.findIndex((entry) => entry.id === id);
    if (index < 0) {
      return withMockDelay(false, 120);
    }

    mockDataStore.payments.splice(index, 1);
    return withMockDelay(true, 140);
  },

  async approvePayment(id) {
    const index = mockDataStore.payments.findIndex((entry) => entry.id === id);
    if (index < 0) {
      return withMockDelay(null, 120);
    }

    const nextPayment = updateReviewState(mockDataStore.payments[index]!, 'approved');
    mockDataStore.payments.splice(index, 1, nextPayment);
    return withMockDelay(nextPayment, 160);
  },

  async rejectPayment(id) {
    const index = mockDataStore.payments.findIndex((entry) => entry.id === id);
    if (index < 0) {
      return withMockDelay(null, 120);
    }

    const nextPayment = updateReviewState(mockDataStore.payments[index]!, 'rejected');
    mockDataStore.payments.splice(index, 1, nextPayment);
    return withMockDelay(nextPayment, 160);
  },

  async verifyPayment(id) {
    const index = mockDataStore.payments.findIndex((entry) => entry.id === id);
    if (index < 0) {
      return withMockDelay(null, 120);
    }

    const nextPayment = updateReviewState(mockDataStore.payments[index]!, 'verified');
    mockDataStore.payments.splice(index, 1, nextPayment);
    return withMockDelay(nextPayment, 160);
  },
};
