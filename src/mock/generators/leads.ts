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

export function generateMockLeads(
  count: number,
  options?: GenerateMockLeadsOptions,
): Lead[] {
  const operators =
    options?.operators ?? generateMockUserSummaries(3, { roles: ['operator'] });

  return Array.from({ length: count }, (_, index) => {
    const { fullName } = createPersonName(index);
    const status = cycleValue(LEAD_STATUSES, index);
    const source = index % 2 === 0 ? 'instagram' : 'telegram';
    const username = createUsername(index);

    return {
      id: createMockId('lead', index),
      fullName,
      username,
      contact: {
        phone: createPhoneNumber(index),
        username,
        email: source === 'instagram' ? undefined : `${username}@mail.com`,
      },
      source,
      status,
      assignedOperator: cycleValue(operators, index),
      notesSummary: cycleValue(MOCK_LEAD_NOTES, index),
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
