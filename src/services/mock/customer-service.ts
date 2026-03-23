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
};
