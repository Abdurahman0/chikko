import type { PaymentService } from '../core/contracts';
import { mockDataStore } from './dataset';
import { filterItemsBySearch, findById, paginateItems, withMockDelay } from './helpers';

export const mockPaymentService: PaymentService = {
  async list(params) {
    const items = filterItemsBySearch(
      mockDataStore.payments,
      params?.search,
      (payment) =>
        `${payment.transactionId ?? ''} ${payment.method} ${payment.status} ${payment.orderId}`,
    );

    return withMockDelay(paginateItems(items, params), 210);
  },
  async getById(id) {
    return withMockDelay(findById(mockDataStore.payments, id), 160);
  },
};
