import {
  ORDER_STATUSES,
  PLATFORM_CHANNELS,
} from '../../constants';
import type { Customer, Order, Product, UserSummary } from '../../types/domain';
import { createMockId, cycleValue, moneyValue, timestampFromIndex } from '../core/helpers';
import { MOCK_ORDER_NOTES } from '../core/catalogs';
import { toCustomerSummary, toProductSummary } from '../core/summaries';
import { generateMockCustomers } from './customers';
import { generateMockProducts } from './products';
import { generateMockUserSummaries } from './users';

interface GenerateMockOrdersOptions {
  customers?: Customer[];
  products?: Product[];
  operators?: UserSummary[];
}

function derivePaymentStatus(orderStatus: Order['orderStatus'], index: number): Order['paymentStatus'] {
  if (orderStatus === 'draft' || orderStatus === 'pending') {
    return index % 2 === 0 ? 'pending' : 'unpaid';
  }

  if (orderStatus === 'cancelled' || orderStatus === 'returned') {
    return index % 2 === 0 ? 'refunded' : 'failed';
  }

  return index % 4 === 0 ? 'partially-refunded' : 'paid';
}

export function generateMockOrders(
  count: number,
  options?: GenerateMockOrdersOptions,
): Order[] {
  const customers = options?.customers ?? generateMockCustomers(Math.max(count, 4));
  const products = options?.products ?? generateMockProducts(8);
  const operators =
    options?.operators ?? generateMockUserSummaries(3, { roles: ['operator'] });

  return Array.from({ length: count }, (_, index) => {
    const orderStatus = cycleValue(ORDER_STATUSES, index);
    const itemCount = (index % 3) + 1;
    const items = Array.from({ length: itemCount }, (_, itemIndex) => {
      const product = products[(index + itemIndex) % products.length]!;
      const quantity = (itemIndex % 3) + 1;
      const unitPrice = product.promoPrice ?? product.price;
      const totalPrice = Number((unitPrice * quantity).toFixed(2));

      return {
        id: createMockId(`order-item-${index + 1}`, itemIndex),
        product: toProductSummary(product),
        quantity,
        unitPrice,
        totalPrice,
      };
    });

    const subtotal = Number(
      items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2),
    );
    const discountAmount = index % 3 === 0 ? Number((subtotal * 0.08).toFixed(2)) : 0;
    const deliveryFee = moneyValue(index, 5, 15, 5);
    const totalAmount = Number((subtotal - discountAmount + deliveryFee).toFixed(2));

    return {
      id: createMockId('order', index),
      orderNumber: `ORD-${String(1001 + index)}`,
      customer: toCustomerSummary(customers[index % customers.length]!),
      items,
      subtotal,
      discountAmount,
      deliveryFee,
      totalAmount,
      currency: 'USD',
      orderStatus,
      paymentStatus: derivePaymentStatus(orderStatus, index),
      assignedOperator: cycleValue(operators, index),
      source: cycleValue(PLATFORM_CHANNELS, index),
      notesSummary: cycleValue(MOCK_ORDER_NOTES, index),
      createdAt: timestampFromIndex(index + 6, { dayStep: 2 }),
      updatedAt: timestampFromIndex(index, { dayStep: 1 }),
    };
  });
}
