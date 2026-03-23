import type { ProductService } from '../core/contracts';
import { mockDataStore } from './dataset';
import { filterItemsBySearch, findById, paginateItems, withMockDelay } from './helpers';

export const mockProductService: ProductService = {
  async list(params) {
    const items = filterItemsBySearch(
      mockDataStore.products,
      params?.search,
      (product) =>
        `${product.name} ${product.sku ?? ''} ${product.category ?? ''} ${product.status}`,
    );

    return withMockDelay(paginateItems(items, params), 190);
  },
  async getById(id) {
    return withMockDelay(findById(mockDataStore.products, id), 145);
  },
};
