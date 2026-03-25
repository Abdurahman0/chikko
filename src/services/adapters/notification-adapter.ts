import type { AppNotification } from '../../types/domain';
import type { AppRole } from '../../types/architecture';
import type { UserSummary } from '../../types/domain';

export type NotificationDto = Record<string, unknown>;

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
}

function readBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  return Boolean(value);
}

function resolveChannel(
  value: unknown,
): AppNotification['channel'] {
  if (value === 'in_app' || value === 'telegram' || value === 'system') {
    return value;
  }

  return 'system';
}

function resolveRole(value: unknown): AppRole {
  if (value === 'developer' || value === 'admin' || value === 'operator') {
    return value;
  }

  return 'operator';
}

function mapUser(value: unknown): UserSummary | null {
  if (typeof value === 'string') {
    const userId = readString(value);
    if (!userId) {
      return null;
    }

    return {
      id: userId,
      fullName: userId,
      role: 'operator',
    };
  }

  const userRecord = toRecord(value);
  if (!userRecord) {
    return null;
  }

  const userId = readString(userRecord.id);
  if (!userId) {
    return null;
  }

  return {
    id: userId,
    fullName:
      readString(userRecord.fullName) ||
      readString(userRecord.full_name) ||
      userId,
    role: resolveRole(userRecord.role),
    avatarUrl: readString(userRecord.avatarUrl) || readString(userRecord.avatar_url) || undefined,
  };
}

function normalizeMetadataValue(
  value: unknown,
): string | number | boolean | null {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function mapMetadataFromObject(
  metadataRecord: Record<string, unknown>,
): AppNotification['metadata'] {
  const normalized: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(metadataRecord)) {
    normalized[key] = normalizeMetadataValue(value);
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

function mapMetadata(value: unknown): AppNotification['metadata'] {
  if (value == null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      const metadataRecord = toRecord(parsed);
      if (metadataRecord) {
        return mapMetadataFromObject(metadataRecord);
      }
    } catch {
      // Fall back to raw string value.
    }

    return { raw: trimmed };
  }

  if (Array.isArray(value)) {
    try {
      return { raw: JSON.stringify(value) };
    } catch {
      return null;
    }
  }

  const metadataRecord = toRecord(value);
  if (!metadataRecord) {
    return null;
  }

  return mapMetadataFromObject(metadataRecord);
}

export function mapNotificationDtoToModel(dto: NotificationDto): AppNotification {
  const nowIso = new Date().toISOString();
  const id = readString(dto.id);
  const title = readString(dto.title);
  const message = readString(dto.message);

  return {
    id: id || `notification-${nowIso}`,
    created_at: readString(dto.created_at, nowIso),
    updated_at: readString(dto.updated_at, nowIso),
    title: title || "Bildirishnoma",
    message: message || '',
    channel: resolveChannel(dto.channel),
    is_read: readBoolean(dto.is_read),
    metadata: mapMetadata(dto.metadata),
    user: mapUser(dto.user),
  };
}

export function mapNotificationListDtoToItems(value: unknown): AppNotification[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toRecord(item))
      .filter((item): item is NotificationDto => item !== null)
      .map((item) => mapNotificationDtoToModel(item));
  }

  const payload = toRecord(value);
  if (!payload) {
    return [];
  }

  const results = Array.isArray(payload.results)
    ? payload.results
    : Array.isArray(payload.items)
      ? payload.items
      : [];

  return results
    .map((item) => toRecord(item))
    .filter((item): item is NotificationDto => item !== null)
    .map((item) => mapNotificationDtoToModel(item));
}
