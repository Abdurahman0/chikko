import type { CurrencyCode, Product } from '../../types/domain';
import { DEFAULT_CURRENCY_CODE } from '../../constants';
import {
  createMockId,
  cycleValue,
  moneyValue,
  numberInRange,
  timestampFromIndex,
} from '../core/helpers';
import { MOCK_PRODUCT_CATEGORIES } from '../core/catalogs';

const PRODUCT_NAME_PREFIXES = [
  'Premium',
  'Aqlli',
  'Signature',
  'Asosiy',
  'Moslashuvchan',
  'Yengil',
  'Studio',
  'Essential',
] as const;

const PRODUCT_NAME_SUFFIXES = [
  'Boshlangich toplam',
  'Paket',
  'Toplam',
  'Nashr',
  'Toplam',
  'Kolleksiya',
  'Seriya',
  'Modul',
] as const;

const PRODUCT_DESCRIPTIONS = [
  'Mijozlarning kundalik buyurtmalarida kop ishlatiladigan talab yuqori mahsulot.',
  'Takroriy xarid darajasi barqaror bolgan ishonchli boshlangich mahsulot.',
  'Kampaniyalar va paketli upsell takliflari uchun optimallashtirilgan.',
  'Mavsumiy aksiyalar va tez yetkazib berish uchun mashhur mahsulot.',
] as const;

const PRODUCT_CURRENCIES: readonly CurrencyCode[] = [DEFAULT_CURRENCY_CODE];

function resolveProductStatus(isActive: boolean, stockQuantity: number): Product['status'] {
  if (!isActive) {
    return 'archived';
  }

  if (stockQuantity <= 0) {
    return 'out-of-stock';
  }

  return 'active';
}

export function generateMockProducts(count: number): Product[] {
  return Array.from({ length: count }, (_, index) => {
    const currency = cycleValue(PRODUCT_CURRENCIES, index);
    const basePrice = moneyValue(index + 3, 22, 280, 9);
    const isActive = index % 6 !== 0;
    const stockQuantity = isActive
      ? numberInRange(index + 2, 0, 160, 8)
      : numberInRange(index + 5, 0, 30, 5);
    const name = `${cycleValue(PRODUCT_NAME_PREFIXES, index)} ${cycleValue(
      MOCK_PRODUCT_CATEGORIES,
      index,
    )} ${cycleValue(PRODUCT_NAME_SUFFIXES, index)}`;

    return {
      id: createMockId('product', index),
      name,
      sku: `CHK-${String(index + 1).padStart(4, '0')}`,
      description: cycleValue(PRODUCT_DESCRIPTIONS, index),
      category: cycleValue(MOCK_PRODUCT_CATEGORIES, index),
      price: basePrice,
      promoPrice:
        isActive && stockQuantity > 0 && index % 4 === 0
          ? Number((basePrice * 0.9).toFixed(2))
          : undefined,
      currency,
      stockQuantity,
      isActive,
      embedding: null,
      metadata: {
        source: 'mock',
        priority: index % 2 === 0 ? 'yuqori' : 'normal',
        internal_code: `PRD-${String(1200 + index)}`,
      },
      status: resolveProductStatus(isActive, stockQuantity),
      imageUrl: `/mock/products/product-${(index % 6) + 1}.jpg`,
      createdAt: timestampFromIndex(index + 38, { dayStep: 2 }),
      updatedAt: timestampFromIndex(index, {
        dayStep: 1,
        hourOffset: (index % 5) + 1,
      }),
    };
  });
}
