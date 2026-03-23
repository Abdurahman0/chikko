import { APP_ROLES, USER_STATUSES } from '../../constants';
import type { AppUser, UserSummary } from '../../types/domain';
import type { AppRole } from '../../types/architecture';
import {
  createEmail,
  createMockId,
  createPersonName,
  createPhoneNumber,
  cycleValue,
  timestampFromIndex,
} from '../core/helpers';
import { toUserSummary } from '../core/summaries';

interface GenerateMockUsersOptions {
  roles?: readonly AppRole[];
}

export function generateMockUsers(
  count: number,
  options?: GenerateMockUsersOptions,
): AppUser[] {
  const roles = options?.roles?.length ? options.roles : APP_ROLES;

  return Array.from({ length: count }, (_, index) => {
    const { fullName } = createPersonName(index);
    const role = cycleValue(roles, index);

    return {
      id: createMockId('user', index),
      fullName,
      email: createEmail(index),
      phone: createPhoneNumber(index),
      role,
      status: cycleValue(USER_STATUSES, index),
      avatarUrl: `/mock/avatars/user-${(index % 6) + 1}.png`,
      permissionKeys:
        role === 'operator'
          ? [`${cycleValue(['leads', 'orders', 'chat'], index)}.view`]
          : undefined,
      lastActiveAt: timestampFromIndex(index, { hourOffset: index % 5 }),
      createdAt: timestampFromIndex(index + 14, { dayStep: 2 }),
      updatedAt: timestampFromIndex(index, { dayStep: 1 }),
    };
  });
}

export function generateMockUserSummaries(
  count: number,
  options?: GenerateMockUsersOptions,
): UserSummary[] {
  return generateMockUsers(count, options).map(toUserSummary);
}
