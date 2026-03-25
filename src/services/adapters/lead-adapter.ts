import type { Lead, LeadSource, LeadStatus, UserSummary } from '../../types/domain';

export type LeadDto = Record<string, unknown>;

const ALLOWED_STATUSES: readonly LeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'negotiating',
  'converted',
  'lost',
];

const ALLOWED_SOURCES: readonly LeadSource[] = [
  'telegram',
  'instagram',
  'manual',
  'website',
  'web',
];

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

function mapMetadata(value: unknown): Lead['metadata'] {
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
      const parsedRecord = toRecord(parsed);
      if (parsedRecord) {
        const normalized: NonNullable<Lead['metadata']> = {};

        for (const [key, recordValue] of Object.entries(parsedRecord)) {
          normalized[key] = normalizeMetadataValue(recordValue);
        }

        return Object.keys(normalized).length > 0 ? normalized : null;
      }
    } catch {
      return { raw: trimmed };
    }

    return { raw: trimmed };
  }

  const metadataRecord = toRecord(value);
  if (!metadataRecord) {
    return null;
  }

  const normalized: NonNullable<Lead['metadata']> = {};
  for (const [key, recordValue] of Object.entries(metadataRecord)) {
    normalized[key] = normalizeMetadataValue(recordValue);
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

function mapAssignedOperator(value: unknown): UserSummary | undefined {
  if (typeof value === 'string') {
    const userId = readString(value);
    if (!userId) {
      return undefined;
    }

    return {
      id: userId,
      fullName: userId,
      role: 'operator',
    };
  }

  const userRecord = toRecord(value);
  if (!userRecord) {
    return undefined;
  }

  const userId = readString(userRecord.id);
  if (!userId) {
    return undefined;
  }

  return {
    id: userId,
    fullName: readString(userRecord.full_name) || readString(userRecord.fullName) || userId,
    role:
      userRecord.role === 'developer' || userRecord.role === 'admin' || userRecord.role === 'operator'
        ? userRecord.role
        : 'operator',
    avatarUrl: readString(userRecord.avatar_url) || readString(userRecord.avatarUrl) || undefined,
  };
}

function normalizeSource(value: unknown): LeadSource {
  const source = readString(value) as LeadSource;
  return ALLOWED_SOURCES.includes(source) ? source : 'manual';
}

function normalizeStatus(value: unknown): LeadStatus {
  const status = readString(value) as LeadStatus;
  return ALLOWED_STATUSES.includes(status) ? status : 'new';
}

export function mapLeadDtoToModel(dto: LeadDto): Lead {
  const nowIso = new Date().toISOString();
  const fullName = readString(dto.full_name) || readString(dto.fullName) || "Noma'lum lid";
  const phone = readString(dto.phone) || undefined;
  const email = readString(dto.email) || undefined;
  const instagramUsername = readString(dto.instagram_username) || undefined;
  const telegramUsername = readString(dto.telegram_username) || undefined;
  const username =
    readString(dto.username) ||
    instagramUsername ||
    telegramUsername ||
    undefined;
  const status = normalizeStatus(dto.status);

  return {
    id: readString(dto.id) || `lead-${nowIso}`,
    fullName,
    username,
    contact: {
      phone,
      email,
      username,
    },
    source: normalizeSource(dto.source),
    status,
    assignedOperator: mapAssignedOperator(dto.assigned_operator),
    instagramUsername,
    telegramUsername,
    notes: readString(dto.notes) || undefined,
    metadata: mapMetadata(dto.metadata),
    notesSummary: readString(dto.notes) || undefined,
    tags: [],
    lastMessageAt: readString(dto.last_message_at) || undefined,
    lastContactAt: readString(dto.last_contact_at) || undefined,
    replied: dto.replied !== undefined ? readBoolean(dto.replied) : undefined,
    dmSent: dto.dm_sent !== undefined ? readBoolean(dto.dm_sent) : undefined,
    createdAt: readString(dto.created_at, nowIso),
    updatedAt: readString(dto.updated_at, nowIso),
  };
}

export function mapLeadListDtoToItems(value: unknown): Lead[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toRecord(item))
      .filter((item): item is LeadDto => item !== null)
      .map((item) => mapLeadDtoToModel(item));
  }

  const payload = toRecord(value);
  if (!payload) {
    return [];
  }

  const items = Array.isArray(payload.results)
    ? payload.results
    : Array.isArray(payload.items)
      ? payload.items
      : [];

  return items
    .map((item) => toRecord(item))
    .filter((item): item is LeadDto => item !== null)
    .map((item) => mapLeadDtoToModel(item));
}
