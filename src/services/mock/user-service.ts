import type { UserService } from '../core/contracts';
import type {
  ManagedUser,
  UserListParams,
  UserMutationInput,
  UserPatchInput,
  UserPermissionCode,
} from '../../types/domain';
import { mockAuthService } from '../../auth/mock-auth-service';
import { mockDataStore } from './dataset';
import { findById, paginateItems, withMockDelay } from './helpers';

type UserOrderingField = 'created_at' | 'updated_at' | 'full_name' | 'email';

const ADMIN_RESTRICTED_PERMISSION_CODES = new Set<UserPermissionCode>([
  'can_manage_ai_settings',
  'can_view_logs',
]);

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function getCurrentActor() {
  return mockAuthService.getCurrentUser();
}

function resolveOrdering(params?: UserListParams): {
  field: UserOrderingField;
  direction: 'asc' | 'desc';
} {
  const requestedOrdering = params?.ordering?.trim();
  if (requestedOrdering) {
    const direction = requestedOrdering.startsWith('-') ? 'desc' : 'asc';
    const field = requestedOrdering.replace('-', '');

    if (
      field === 'created_at' ||
      field === 'updated_at' ||
      field === 'full_name' ||
      field === 'email'
    ) {
      return { field, direction };
    }
  }

  return { field: 'updated_at', direction: 'desc' };
}

function compareUsers(left: ManagedUser, right: ManagedUser, field: UserOrderingField): number {
  if (field === 'full_name') {
    return left.full_name.localeCompare(right.full_name);
  }

  if (field === 'email') {
    return left.email.localeCompare(right.email);
  }

  const leftValue = field === 'created_at' ? left.created_at : left.updated_at;
  const rightValue = field === 'created_at' ? right.created_at : right.updated_at;
  return new Date(leftValue).getTime() - new Date(rightValue).getTime();
}

function assertUniqueEmail(email: string, excludeId?: string) {
  const duplicated = mockDataStore.managedUsers.some(
    (user) => user.email === email && user.id !== excludeId,
  );

  if (duplicated) {
    throw new Error('Email already exists.');
  }
}

function assertCanManageUsers() {
  const actor = getCurrentActor();
  if (!actor) {
    throw new Error('Authentication is required.');
  }

  if (actor.role === 'developer') {
    return actor;
  }

  if (!actor.permissionKeys.includes('can_manage_users')) {
    throw new Error('Forbidden action.');
  }

  return actor;
}

function assertTargetConstraints(
  actor: NonNullable<ReturnType<typeof getCurrentActor>>,
  target: ManagedUser,
) {
  if (target.role === 'developer' && actor.role !== 'developer') {
    throw new Error('Only developer can manage developer users.');
  }
}

function mapPermissionIdsToCodes(permissionIds: string[]): UserPermissionCode[] {
  return permissionIds
    .map((permissionId) => mockDataStore.permissionCatalog.find((permission) => permission.id === permissionId)?.code)
    .filter((code): code is UserPermissionCode => Boolean(code));
}

function sanitizeCustomPermissionIds(
  actor: NonNullable<ReturnType<typeof getCurrentActor>>,
  role: ManagedUser['role'],
  customPermissionIds: string[] | undefined,
): string[] {
  if (role !== 'operator') {
    return [];
  }

  const requested = customPermissionIds ?? [];
  const uniqueIds = Array.from(new Set(requested));
  const validIds = uniqueIds.filter((permissionId) =>
    mockDataStore.permissionCatalog.some((permission) => permission.id === permissionId),
  );

  if (actor.role !== 'developer') {
    const requestedCodes = mapPermissionIdsToCodes(validIds);
    if (requestedCodes.some((code) => ADMIN_RESTRICTED_PERMISSION_CODES.has(code))) {
      throw new Error('Admin cannot assign developer-only permissions.');
    }
  }

  return validIds;
}

function normalizeMutationInput(
  actor: NonNullable<ReturnType<typeof getCurrentActor>>,
  input: UserMutationInput,
  options?: { excludeId?: string; allowDeveloperRole?: boolean },
) {
  const email = normalizeEmail(input.email);
  const fullName = input.full_name.trim();
  const phone = normalizeText(input.phone);
  const password = normalizeText(input.password);
  const role = input.role;

  if (!email || !email.includes('@')) {
    throw new Error('Valid email is required.');
  }

  if (!fullName) {
    throw new Error('Full name is required.');
  }

  if (role === 'developer' && actor.role !== 'developer') {
    throw new Error('Only developer can create or update developer role users.');
  }

  if (!options?.allowDeveloperRole && role === 'developer' && actor.role !== 'developer') {
    throw new Error('Forbidden action.');
  }

  assertUniqueEmail(email, options?.excludeId);

  const customPermissions = sanitizeCustomPermissionIds(
    actor,
    role,
    input.custom_permission_ids,
  );

  return {
    email,
    full_name: fullName,
    phone,
    password,
    role,
    is_active: input.is_active,
    custom_permissions: customPermissions,
  };
}

function resolvePatchPayload(existing: ManagedUser, input: UserPatchInput): UserMutationInput {
  return {
    email: input.email ?? existing.email,
    full_name: input.full_name ?? existing.full_name,
    phone: input.phone ?? existing.phone ?? null,
    password: input.password,
    role: input.role ?? existing.role,
    is_active: input.is_active ?? existing.is_active,
    custom_permission_ids: input.custom_permission_ids ?? existing.custom_permissions,
  };
}

export const mockUserService: UserService = {
  async listUsers(params) {
    const roleFilter = params?.role;
    const activeFilter = params?.is_active;
    const ordering = resolveOrdering(params);
    const search = params?.search?.trim().toLowerCase();

    const filtered = mockDataStore.managedUsers.filter((user) => {
      const matchesSearch =
        !search ||
        `${user.email} ${user.full_name} ${user.phone ?? ''}`.toLowerCase().includes(search);
      const matchesRole = !roleFilter || user.role === roleFilter;
      const matchesActive =
        typeof activeFilter !== 'boolean' || user.is_active === activeFilter;

      return matchesSearch && matchesRole && matchesActive;
    });

    const sorted = [...filtered].sort((left, right) => {
      const compared = compareUsers(left, right, ordering.field);
      if (compared === 0) {
        return left.id.localeCompare(right.id);
      }

      return ordering.direction === 'asc' ? compared : -compared;
    });

    return withMockDelay(paginateItems(sorted, params), 180);
  },

  async getUserById(id) {
    return withMockDelay(findById(mockDataStore.managedUsers, id), 140);
  },

  async createUser(input) {
    const actor = assertCanManageUsers();
    const payload = normalizeMutationInput(actor, input, { allowDeveloperRole: true });
    const now = new Date().toISOString();

    const nextUser: ManagedUser = {
      id: `managed-user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      email: payload.email,
      full_name: payload.full_name,
      phone: payload.phone,
      role: payload.role,
      is_active: payload.is_active,
      custom_permissions: payload.custom_permissions,
      created_by: `managed-${actor.id}`,
      created_at: now,
      updated_at: now,
    };

    mockDataStore.managedUsers.unshift(nextUser);
    return withMockDelay(nextUser, 170);
  },

  async updateUser(id, input) {
    const actor = assertCanManageUsers();
    const index = mockDataStore.managedUsers.findIndex((user) => user.id === id);
    if (index < 0) {
      return withMockDelay(null, 140);
    }

    const existing = mockDataStore.managedUsers[index]!;
    assertTargetConstraints(actor, existing);

    const payload = normalizeMutationInput(actor, input, {
      excludeId: id,
      allowDeveloperRole: true,
    });

    const nextUser: ManagedUser = {
      ...existing,
      email: payload.email,
      full_name: payload.full_name,
      phone: payload.phone,
      role: payload.role,
      is_active: payload.is_active,
      custom_permissions: payload.custom_permissions,
      updated_at: new Date().toISOString(),
    };

    mockDataStore.managedUsers.splice(index, 1, nextUser);
    return withMockDelay(nextUser, 170);
  },

  async patchUser(id, input) {
    const existing = mockDataStore.managedUsers.find((user) => user.id === id);
    if (!existing) {
      return withMockDelay(null, 140);
    }

    const payload = resolvePatchPayload(existing, input);
    return this.updateUser(id, payload);
  },

  async deleteUser(id) {
    const actor = assertCanManageUsers();
    const index = mockDataStore.managedUsers.findIndex((user) => user.id === id);
    if (index < 0) {
      return withMockDelay(false, 120);
    }

    const target = mockDataStore.managedUsers[index]!;
    assertTargetConstraints(actor, target);

    if (`managed-${actor.id}` === target.id) {
      throw new Error('Current user cannot be deleted.');
    }

    if (target.role === 'developer') {
      throw new Error('Developer user cannot be deleted.');
    }

    mockDataStore.managedUsers.splice(index, 1);
    return withMockDelay(true, 130);
  },

  async toggleUserActive(id) {
    const actor = assertCanManageUsers();
    const index = mockDataStore.managedUsers.findIndex((user) => user.id === id);
    if (index < 0) {
      return withMockDelay(null, 130);
    }

    const existing = mockDataStore.managedUsers[index]!;
    assertTargetConstraints(actor, existing);

    if (`managed-${actor.id}` === existing.id && existing.is_active) {
      throw new Error('Current user cannot deactivate own account.');
    }

    const nextUser: ManagedUser = {
      ...existing,
      is_active: !existing.is_active,
      updated_at: new Date().toISOString(),
    };

    mockDataStore.managedUsers.splice(index, 1, nextUser);
    return withMockDelay(nextUser, 150);
  },

  async listPermissions() {
    return withMockDelay([...mockDataStore.permissionCatalog], 120);
  },

  async getPermissionById(id) {
    return withMockDelay(findById(mockDataStore.permissionCatalog, id), 100);
  },
};
