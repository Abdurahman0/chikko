import type { Customer, Lead, UserSummary } from '../../types/domain';
import {
  createEmail,
  createMockId,
  createPersonName,
  createPhoneNumber,
  createUsername,
  cycleValue,
  moneyValue,
  timestampFromIndex,
} from '../core/helpers';
import { MOCK_SEGMENTS } from '../core/catalogs';
import { toLeadSummary } from '../core/summaries';

interface GenerateMockCustomersOptions {
  operators?: UserSummary[];
  leads?: Lead[];
}

const DISTRICTS = [
  'Yunusabad',
  'Mirzo Ulugbek',
  'Chilonzor',
  'Yakkasaray',
  'Shaykhontohur',
  'Olmazor',
  'Sergeli',
  'Mirobod',
] as const;

const STREET_NAMES = [
  'Navoiy shoh kochasi',
  'Amir Temur kochasi',
  'Bunyodkor shoh kochasi',
  'Shota Rustaveli kochasi',
  'Mustaqillik shoh kochasi',
  'Afrosiyob kochasi',
  'Bobur kochasi',
  'Kichik halqa yoli',
] as const;

const CUSTOMER_NOTES = [
  'Soat 11:00 gacha Telegram yangilanishlarini afzal koradi.',
  'Odatda buyurtmani kechqurun telefon orqali tasdiqlaydi.',
  'Tolovdan oldin invoice nusxasini soraydi.',
  'Instagram direct xabarlariga tez javob beradi.',
  'Dam olish kunlari yetkazib berishni alohida muvofiqlashtirish kerak.',
] as const;

export function generateMockCustomers(
  count: number,
  options?: GenerateMockCustomersOptions,
): Customer[] {
  const operators = options?.operators ?? [];
  const leads = options?.leads ?? [];

  return Array.from({ length: count }, (_, index) => {
    const { fullName } = createPersonName(index + 20);
    const username = createUsername(index + 20);
    const totalOrders = index % 6 === 0 ? 0 : (index % 5) + 1;
    const totalSpent =
      totalOrders === 0 ? 0 : totalOrders * moneyValue(index, 45, 180, 15);
    const city = cycleValue(['Toshkent', 'Samarqand', 'Buxoro'], index);
    const hasAddress = index % 9 !== 0;
    const assignedOperator =
      operators.length > 0 && index % 5 !== 0
        ? cycleValue(operators, index)
        : undefined;
    const linkedLead =
      leads.length > 0 && index % 3 === 0
        ? toLeadSummary(leads[index % leads.length]!)
        : undefined;
    const notes =
      index % 4 === 0 ? undefined : cycleValue(CUSTOMER_NOTES, index);
    const lastOrderAt =
      totalOrders > 0 ? timestampFromIndex(index, { dayStep: 3 }) : undefined;

    return {
      id: createMockId('customer', index),
      fullName,
      username,
      contact: {
        phone: createPhoneNumber(index + 20),
        email: index % 7 === 0 ? undefined : createEmail(index + 20),
        username,
      },
      address: hasAddress
        ? {
            line1: `${12 + index} ${cycleValue(STREET_NAMES, index)}`,
            city,
            region: cycleValue(DISTRICTS, index),
            country: "O'zbekiston",
          }
        : undefined,
      notes,
      notesSummary: notes,
      metadata: {
        crm_tier: cycleValue(['starter', 'growth', 'enterprise'], index),
        preferred_channel: index % 2 === 0 ? 'telegram' : 'instagram',
        lifetime_value_band: totalSpent > 500 ? 'high' : 'standard',
      },
      lead: linkedLead,
      assignedOperator,
      segments: [cycleValue(MOCK_SEGMENTS, index)],
      totalOrders,
      totalSpent,
      currency: 'USD',
      lastOrderAt,
      createdAt: timestampFromIndex(index + 24, { dayStep: 3 }),
      updatedAt: timestampFromIndex(index, {
        dayStep: 1,
        hourOffset: (index % 6) + 1,
      }),
    };
  });
}
