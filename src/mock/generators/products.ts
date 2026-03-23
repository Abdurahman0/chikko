import { PRODUCT_STATUSES } from '../../constants';
import type { Product } from '../../types/domain';
import {
  createMockId,
  cycleValue,
  moneyValue,
  numberInRange,
  timestampFromIndex,
} from '../core/helpers';
import { MOCK_PRODUCT_CATEGORIES } from '../core/catalogs';

export function generateMockProducts(count: number): Product[] {
  return Array.from({ length: count }, (_, index) => {
    const status = cycleValue(PRODUCT_STATUSES, index);
    const price = moneyValue(index, 18, 140, 7);

    return {
      id: createMockId('product', index),
      name: `${cycleValue(MOCK_PRODUCT_CATEGORIES, index)} Item ${index + 1}`,
      sku: `CHK-${String(index + 1).padStart(4, '0')}`,
      category: cycleValue(MOCK_PRODUCT_CATEGORIES, index),
      price,
      promoPrice:
        status === 'active' && index % 3 === 0 ? Number((price - 5).toFixed(2)) : undefined,
      currency: 'USD',
      stockQuantity:
        status === 'out-of-stock' ? 0 : numberInRange(index, 8, 120, 7),
      status,
      imageUrl: `/mock/products/product-${(index % 6) + 1}.jpg`,
      createdAt: timestampFromIndex(index + 30, { dayStep: 2 }),
      updatedAt: timestampFromIndex(index, { dayStep: 1 }),
    };
  });
}
