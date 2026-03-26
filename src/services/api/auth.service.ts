import { apiClient } from '../../lib/api-client';
import type { AuthTokens } from '../../lib/auth-storage';
import { PERMISSION_CODES, type AuthenticatedUser, type PermissionCode } from '../../auth/types';
import type { AppRole } from '../../types/architecture';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse extends Partial<AuthTokens> {
  user?: unknown;
}

type MeResponse = unknown;

const PERMISSION_CODE_SET = new Set<string>(PERMISSION_CODES);
const PRIMARY_PERMISSION_COLLECTION_KEYS = [
  'permissionKeys',
  'permission_keys',
  'custom_permissions',
  'custom_permission_ids',
  'effective_permissions',
  'role_permissions',
] as const;

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function resolveRole(value: unknown): AppRole {
  if (value === 'developer' || value === 'admin' || value === 'operator') {
    return value;
  }

  return 'operator';
}

function toPermissionCode(value: unknown): PermissionCode | null {
  const raw = readString(value);
  if (!raw) {
    return null;
  }

  return PERMISSION_CODE_SET.has(raw) ? (raw as PermissionCode) : null;
}

function pushPermissionCode(value: unknown, bucket: Set<PermissionCode>): void {
  const directCode = toPermissionCode(value);
  if (directCode) {
    bucket.add(directCode);
    return;
  }

  const raw = readString(value);
  if (!raw || (!raw.includes(',') && !raw.includes(' '))) {
    return;
  }

  raw
    .split(/[,\s]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .forEach((token) => {
      if (PERMISSION_CODE_SET.has(token)) {
        bucket.add(token as PermissionCode);
      }
    });
}

function collectPermissionCodes(
  value: unknown,
  bucket: Set<PermissionCode>,
  depth = 0,
): void {
  if (depth > 3 || value === null || typeof value === 'undefined') {
    return;
  }

  pushPermissionCode(value, bucket);

  if (Array.isArray(value)) {
    value.forEach((entry) => collectPermissionCodes(entry, bucket, depth + 1));
    return;
  }

  const record = toRecord(value);
  if (!record) {
    return;
  }

  pushPermissionCode(record.code, bucket);
  pushPermissionCode(record.permission, bucket);
  pushPermissionCode(record.permission_code, bucket);
  pushPermissionCode(record.key, bucket);
  pushPermissionCode(record.name, bucket);

  PRIMARY_PERMISSION_COLLECTION_KEYS.forEach((key) => {
    collectPermissionCodes(record[key], bucket, depth + 1);
  });

  collectPermissionCodes(record.results, bucket, depth + 1);
  collectPermissionCodes(record.items, bucket, depth + 1);
  collectPermissionCodes(record.data, bucket, depth + 1);
}

function resolvePermissionCodes(userRecord: Record<string, unknown>, role: AppRole): PermissionCode[] {
  if (role === 'developer') {
    return [...PERMISSION_CODES];
  }

  const resolvedCodes = new Set<PermissionCode>();

  PRIMARY_PERMISSION_COLLECTION_KEYS.forEach((key) => {
    collectPermissionCodes(userRecord[key], resolvedCodes);
  });

  PERMISSION_CODES.forEach((permissionCode) => {
    if (userRecord[permissionCode] === true) {
      resolvedCodes.add(permissionCode);
    }
  });

  if (resolvedCodes.size === 0) {
    // Fallback for backends that only expose assigned permissions as `permissions`.
    collectPermissionCodes(userRecord.permissions, resolvedCodes);
  }

  return Array.from(resolvedCodes);
}

function normalizeUser(rawUser: unknown): AuthenticatedUser {
  const userRecord = toRecord(rawUser) ?? {};
  const nowIso = new Date().toISOString();
  const role = resolveRole(userRecord.role);
  const email = readString(userRecord.email) ?? '';
  const fullName =
    readString(userRecord.fullName) ??
    readString(userRecord.full_name) ??
    readString(userRecord.name) ??
    email;

  const statusValue = userRecord.status;
  const isActiveValue = userRecord.is_active;
  const status =
    statusValue === 'active' || statusValue === 'inactive' || statusValue === 'invited'
      ? statusValue
      : isActiveValue === false
        ? 'inactive'
        : 'active';

  return {
    id: readString(userRecord.id) ?? email ?? `user-${Date.now()}`,
    fullName: fullName || "Noma'lum foydalanuvchi",
    email,
    phone: readString(userRecord.phone) ?? undefined,
    role,
    status,
    avatarUrl: readString(userRecord.avatarUrl) ?? readString(userRecord.avatar_url) ?? undefined,
    permissionKeys: resolvePermissionCodes(userRecord, role),
    createdAt:
      readString(userRecord.createdAt) ??
      readString(userRecord.created_at) ??
      nowIso,
    updatedAt:
      readString(userRecord.updatedAt) ??
      readString(userRecord.updated_at) ??
      nowIso,
  };
}

export interface AuthLoginResult extends AuthTokens {
  user: AuthenticatedUser;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthLoginResult> {
    const payload: LoginRequest = { email, password };
    const { data } = await apiClient.post<LoginResponse>('/api/auth/login/', payload, {
      _skipAuthRefresh: true,
    });

    if (typeof data.access !== 'string' || typeof data.refresh !== 'string') {
      throw new Error('Invalid login response.');
    }

    return {
      access: data.access,
      refresh: data.refresh,
      user: normalizeUser(data.user),
    };
  },

  async getMe(): Promise<AuthenticatedUser> {
    const { data } = await apiClient.get<MeResponse>('/api/auth/me/');
    return normalizeUser(data);
  },

  async refreshToken(refresh: string): Promise<AuthTokens> {
    const { data } = await apiClient.post<Partial<AuthTokens>>(
      '/api/auth/refresh/',
      { refresh },
      { _skipAuthRefresh: true },
    );

    if (typeof data.access !== 'string' || data.access.length === 0) {
      throw new Error('Invalid refresh response.');
    }

    return {
      access: data.access,
      refresh: typeof data.refresh === 'string' && data.refresh.length > 0
        ? data.refresh
        : refresh,
    };
  },
};
