import { PAYMENT_METHODS } from '../../constants';
import type { Order, Payment } from '../../types/domain';
import { createMockId, cycleValue, timestampFromIndex } from '../core/helpers';
import { generateMockOrders } from './orders';

interface GenerateMockPaymentsOptions {
  orders?: Order[];
}

export function generateMockPayments(
  count: number,
  options?: GenerateMockPaymentsOptions,
): Payment[] {
  const orders = options?.orders ?? generateMockOrders(Math.max(count, 4));

  return Array.from({ length: count }, (_, index) => {
    const order = orders[index % orders.length]!;
    const orderPaymentStatus =
      order.paymentStatus ??
      (order.status === 'cancelled'
        ? 'failed'
        : order.status === 'draft'
          ? 'unpaid'
          : order.status === 'waiting_payment' || order.status === 'pending'
            ? 'pending'
            : 'paid');
    const isPaidState =
      orderPaymentStatus === 'paid' ||
      orderPaymentStatus === 'refunded' ||
      orderPaymentStatus === 'partially-refunded';

    return {
      id: createMockId('payment', index),
      orderId: order.id,
      transactionId: `TX-${String(70001 + index)}`,
      method: cycleValue(PAYMENT_METHODS, index),
      amount: order.totalAmount,
      currency: order.currency ?? 'USD',
      status: orderPaymentStatus,
      paidAt: isPaidState ? timestampFromIndex(index, { hourOffset: 1 }) : undefined,
      createdAt: timestampFromIndex(index + 5, { dayStep: 2 }),
      updatedAt: timestampFromIndex(index, { dayStep: 1 }),
    };
  });
}
