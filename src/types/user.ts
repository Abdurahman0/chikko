import type { AppRole } from './architecture';
import type { AuditInfo, EntityId, TimestampString } from './common';

export type UserRole = AppRole;

export type UserStatus = 'active' | 'inactive' | 'invited';

export interface UserSummary {
  id: EntityId;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface AppUser extends AuditInfo {
  id: EntityId;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  status?: UserStatus;
  avatarUrl?: string;
  permissionKeys?: string[];
  lastActiveAt?: TimestampString;
}
