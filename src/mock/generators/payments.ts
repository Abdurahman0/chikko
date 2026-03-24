import { PAYMENT_METHODS } from '../../constants';
import type { Order, Payment } from '../../types/domain';
import {
  createMockId,
  createPersonName,
  cycleValue,
  timestampFromIndex,
} from '../core/helpers';
import { generateMockOrders } from './orders';

interface GenerateMockPaymentsOptions {
  orders?: Order[];
}

export function generateMockPayments(
  count: number,
  options?: GenerateMockPaymentsOptions,
): Payment[] {
  const orders = options?.orders ?? generateMockOrders(Math.max(count, 4));
  const statuses: Payment['status'][] = [
    'pending',
    'approved',
    'rejected',
    'verified',
    'failed',
    'pending',
    'approved',
    'pending',
    'verified',
    'pending',
  ];
  const reviewers = [
    'Operator Payments',
    'Finance Lead',
    'Risk Officer',
    'Senior Auditor',
  ] as const;

  return Array.from({ length: count }, (_, index) => {
    const order = orders[index % orders.length]!;
    const status = cycleValue(statuses, index);
    const createdAt = timestampFromIndex(index + 3, {
      dayStep: 1,
      hourOffset: (index % 11) + 2,
    });
    const reviewedAt =
      status === 'pending'
        ? null
        : timestampFromIndex(index, {
            dayStep: 1,
            hourOffset: (index % 4) + 1,
          });
    const hasScreenshot = index % 4 !== 0;
    const submittedBy = createPersonName(index + 20).fullName;
    const isManual = cycleValue(PAYMENT_METHODS, index) === 'manual';
    const amountVariance = ((index % 5) - 2) * 3.75;
    const amount = Number(Math.max(5, order.totalAmount + amountVariance).toFixed(2));
    const shouldHaveVerificationReference =
      status === 'verified' || (status === 'approved' && index % 3 === 0);

    return {
      id: createMockId('payment', index),
      created_at: createdAt,
      updated_at: timestampFromIndex(index, { minuteOffset: (index % 40) + 4 }),
      amount,
      status,
      method: cycleValue(PAYMENT_METHODS, index),
      screenshot: hasScreenshot
        ? `https://cdn.chikko.mock/payments/receipt-${String(index + 1).padStart(3, '0')}.jpg`
        : null,
      last_four_digits: isManual
        ? index % 6 === 0
          ? null
          : String(1000 + ((index * 173) % 9000))
        : String(1000 + ((index * 197) % 9000)),
      submitted_by_name: submittedBy,
      reviewed_at: reviewedAt,
      metadata:
        index % 5 === 0
          ? null
          : {
              channel: order.source,
              receipt_quality: index % 3 === 0 ? 'good' : 'needs-review',
              device: index % 2 === 0 ? 'ios' : 'android',
              is_high_value: amount >= 500,
            },
      verification_reference: shouldHaveVerificationReference
        ? `VRF-${new Date(createdAt).getUTCFullYear()}-${String(88000 + index)}`
        : null,
      order: order.id,
      reviewed_by: reviewedAt ? cycleValue(reviewers, index) : null,
    };
  });
}
