import type { CustomerService } from '../core/contracts';
import { mockDataStore } from './dataset';
import { filterItemsBySearch, findById, paginateItems, withMockDelay } from './helpers';

export const mockCustomerService: CustomerService = {
  async list(params) {
    const items = filterItemsBySearch(
      mockDataStore.customers,
      params?.search,
      (customer) =>
        `${customer.fullName} ${customer.contact.phone ?? ''} ${customer.username ?? ''}`,
    );

    return withMockDelay(paginateItems(items, params), 200);
  },
  async getById(id) {
    return withMockDelay(findById(mockDataStore.customers, id), 150);
  },
};
