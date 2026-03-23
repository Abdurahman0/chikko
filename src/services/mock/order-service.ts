import type { OrderService } from '../core/contracts';
import { mockDataStore } from './dataset';
import { filterItemsBySearch, findById, paginateItems, withMockDelay } from './helpers';

export const mockOrderService: OrderService = {
  async list(params) {
    const items = filterItemsBySearch(
      mockDataStore.orders,
      params?.search,
      (order) =>
        `${order.orderNumber} ${order.customer.fullName} ${order.orderStatus} ${order.paymentStatus}`,
    );

    return withMockDelay(paginateItems(items, params), 220);
  },
  async getById(id) {
    return withMockDelay(findById(mockDataStore.orders, id), 170);
  },
};
