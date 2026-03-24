import {
  LEAD_STATUSES,
} from '../../constants';
import type { Lead, UserSummary } from '../../types/domain';
import {
  createMockId,
  createPersonName,
  createPhoneNumber,
  createUsername,
  cycleValue,
  pickMany,
  timestampFromIndex,
} from '../core/helpers';
import { MOCK_LEAD_NOTES, MOCK_TAGS } from '../core/catalogs';
import { generateMockUserSummaries } from './users';

interface GenerateMockLeadsOptions {
  operators?: UserSummary[];
}

const LEAD_SOURCES: ReadonlyArray<Lead['source']> = [
  'telegram',
  'instagram',
  'manual',
  'website',
  'web',
];

export function generateMockLeads(
  count: number,
  options?: GenerateMockLeadsOptions,
): Lead[] {
  const operators =
    options?.operators ?? generateMockUserSummaries(3, { roles: ['operator'] });

  return Array.from({ length: count }, (_, index) => {
    const { fullName } = createPersonName(index);
    const status = cycleValue(LEAD_STATUSES, index);
    const source = cycleValue(LEAD_SOURCES, index);
    const baseUsername = createUsername(index);
    const instagramUsername =
      source === 'instagram' || index % 3 === 0 ? baseUsername : undefined;
    const telegramUsername =
      source === 'telegram' || index % 4 === 0 ? `tg_${baseUsername}` : undefined;
    const username = instagramUsername ?? telegramUsername ?? baseUsername;
    const notesSummary = cycleValue(MOCK_LEAD_NOTES, index);

    return {
      id: createMockId('lead', index),
      fullName,
      username,
      contact: {
        phone: createPhoneNumber(index),
        username,
        email: `${baseUsername}@mail.com`,
      },
      source,
      status,
      assignedOperator: cycleValue(operators, index),
      instagramUsername,
      telegramUsername,
      notes: notesSummary,
      metadata: {
        region: index % 2 === 0 ? 'Toshkent' : 'Samarqand',
        priority: index % 5 === 0 ? 'high' : 'normal',
      },
      notesSummary,
      tags: pickMany(MOCK_TAGS, index, 2),
      lastMessageAt: timestampFromIndex(index, { hourOffset: 2 }),
      lastContactAt: timestampFromIndex(index, { hourOffset: 4 }),
      replied: status !== 'new' && status !== 'lost',
      dmSent: status !== 'new',
      createdAt: timestampFromIndex(index + 10, { dayStep: 2 }),
      updatedAt: timestampFromIndex(index, { dayStep: 1 }),
    };
  });
}
