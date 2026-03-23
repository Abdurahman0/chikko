import type { Customer } from '../../types/domain';
import {
  createMockId,
  createPersonName,
  createPhoneNumber,
  createUsername,
  cycleValue,
  moneyValue,
  timestampFromIndex,
} from '../core/helpers';
import { MOCK_SEGMENTS } from '../core/catalogs';

export function generateMockCustomers(count: number): Customer[] {
  return Array.from({ length: count }, (_, index) => {
    const { fullName } = createPersonName(index + 20);
    const totalOrders = (index % 5) + 1;
    const totalSpent = totalOrders * moneyValue(index, 45, 180, 15);

    return {
      id: createMockId('customer', index),
      fullName,
      username: createUsername(index + 20),
      contact: {
        phone: createPhoneNumber(index + 20),
        username: createUsername(index + 20),
      },
      address: {
        line1: `${12 + index} Central Street`,
        city: 'Tashkent',
        region: 'Tashkent City',
        country: 'Uzbekistan',
      },
      segments: [cycleValue(MOCK_SEGMENTS, index)],
      totalOrders,
      totalSpent,
      currency: 'USD',
      lastOrderAt: timestampFromIndex(index, { dayStep: 3 }),
      notesSummary: `Customer prefers ${cycleValue(
        ['morning follow-up', 'Telegram updates', 'price-first discussion'],
        index,
      )}.`,
      createdAt: timestampFromIndex(index + 24, { dayStep: 3 }),
      updatedAt: timestampFromIndex(index, { dayStep: 1 }),
    };
  });
}
