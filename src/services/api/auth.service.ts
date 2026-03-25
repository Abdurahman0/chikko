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

function resolvePermissionCodes(userRecord: Record<string, unknown>, role: AppRole): PermissionCode[] {
  const permissionKeysValue = userRecord.permissionKeys ?? userRecord.permission_keys;
  const permissionsValue = userRecord.permissions;
  const resolvedCodes: PermissionCode[] = [];

  if (Array.isArray(permissionKeysValue)) {
    for (const item of permissionKeysValue) {
      const code = readString(item);
      if (code && PERMISSION_CODE_SET.has(code)) {
        resolvedCodes.push(code as PermissionCode);
      }
    }
  }

  if (Array.isArray(permissionsValue)) {
    for (const permission of permissionsValue) {
      const permissionRecord = toRecord(permission);
      const code = readString(permissionRecord?.code);
      if (code && PERMISSION_CODE_SET.has(code)) {
        resolvedCodes.push(code as PermissionCode);
      }
    }
  }

  if (role === 'developer') {
    return [...PERMISSION_CODES];
  }

  return Array.from(new Set(resolvedCodes));
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
