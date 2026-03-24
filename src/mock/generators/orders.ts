import { DEFAULT_CURRENCY_CODE, ORDER_STATUSES } from '../../constants';
import type {
  Customer,
  Lead,
  Order,
  OrderSource,
  OrderStatus,
  Product,
} from '../../types/domain';
import {
  createMockId,
  createPersonName,
  createPhoneNumber,
  cycleValue,
  timestampFromIndex,
} from '../core/helpers';
import { MOCK_ORDER_NOTES } from '../core/catalogs';
import {
  toCustomerSummary,
  toLeadSummary,
  toProductSummary,
} from '../core/summaries';
import { generateMockCustomers } from './customers';
import { generateMockLeads } from './leads';
import { generateMockProducts } from './products';

interface GenerateMockOrdersOptions {
  customers?: Customer[];
  leads?: Lead[];
  products?: Product[];
}

const ORDER_SOURCES: readonly OrderSource[] = [
  'telegram',
  'instagram',
  'manual',
];

function deriveLegacyPaymentStatus(status: OrderStatus): Order['paymentStatus'] {
  switch (status) {
    case 'draft':
      return 'unpaid';
    case 'waiting_payment':
    case 'pending':
      return 'pending';
    case 'confirmed':
    case 'paid':
      return 'paid';
    case 'completed':
      return 'paid';
    case 'cancelled':
    default:
      return 'failed';
  }
}

function resolveShippingAddress(customer: Customer | undefined, index: number): string {
  if (customer?.address) {
    const addressParts = [
      customer.address.line1,
      customer.address.city,
      customer.address.region,
      customer.address.country,
    ].filter(Boolean);

    if (addressParts.length > 0) {
      return addressParts.join(', ');
    }
  }

  const district = cycleValue(
    ['Yunusobod', 'Chilonzor', 'Mirobod', 'Sergeli', 'Olmazor'],
    index,
  );
  return `${20 + index}-uy, ${district}, Toshkent`;
}

export function generateMockOrders(
  count: number,
  options?: GenerateMockOrdersOptions,
): Order[] {
  const customers = options?.customers ?? generateMockCustomers(Math.max(count, 6));
  const leads = options?.leads ?? generateMockLeads(Math.max(count, 6));
  const products = options?.products ?? generateMockProducts(10);

  return Array.from({ length: count }, (_, index) => {
    const status = cycleValue(ORDER_STATUSES, index);
    const source = cycleValue(ORDER_SOURCES, index);
    const customer =
      index % 5 === 0
        ? undefined
        : customers[index % customers.length];
    const lead = customer?.lead
      ? customer.lead
      : index % 4 === 0
        ? toLeadSummary(leads[index % leads.length]!)
        : undefined;
    const aiGenerated = index % 3 === 0;
    const itemCount = (index % 3) + 1;
    const nowLabel = String(1001 + index).padStart(4, '0');
    const contactPerson = customer?.fullName ?? createPersonName(index + 50).fullName;
    const contactPhone = customer?.contact.phone ?? createPhoneNumber(index + 40);
    const notes = index % 4 === 0 ? undefined : cycleValue(MOCK_ORDER_NOTES, index);
    const items = Array.from({ length: itemCount }, (_, itemIndex) => {
      const product = products[(index + itemIndex) % products.length]!;
      const quantity = (itemIndex % 3) + 1;
      const unitPrice = product.promoPrice ?? product.price;
      const lineTotal = Number((unitPrice * quantity).toFixed(2));

      return {
        id: createMockId(`order-item-${index + 1}`, itemIndex),
        product: toProductSummary(product),
        quantity,
        unitPrice,
        lineTotal,
        totalPrice: lineTotal,
      };
    });
    const totalAmount = Number(
      items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2),
    );
    const currency = items[0]?.product.currency ?? DEFAULT_CURRENCY_CODE;

    return {
      id: createMockId('order', index),
      customer: customer ? toCustomerSummary(customer) : undefined,
      lead,
      status,
      source,
      contactName: contactPerson,
      contactPhone,
      shippingAddress: resolveShippingAddress(customer, index),
      notes,
      metadata: {
        sales_stage: status,
        priority: index % 2 === 0 ? 'yuqori' : 'odatiy',
      },
      aiGenerated,
      totalAmount,
      currency,
      items,
      orderNumber: `ORD-${nowLabel}`,
      orderStatus: status,
      paymentStatus: deriveLegacyPaymentStatus(status),
      notesSummary: notes,
      createdAt: timestampFromIndex(index + 8, { dayStep: 2 }),
      updatedAt: timestampFromIndex(index, {
        dayStep: 1,
        hourOffset: (index % 6) + 1,
      }),
    };
  });
}
