import { DEFAULT_CURRENCY_CODE } from '../../constants';
import type { Customer, CustomerMetadata, LeadSummary, UserSummary } from '../../types/domain';

export type CustomerDto = Record<string, unknown>;

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

function mapMetadata(value: unknown): CustomerMetadata | null {
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
        const normalized: CustomerMetadata = {};
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

  const normalized: CustomerMetadata = {};
  for (const [key, recordValue] of Object.entries(metadataRecord)) {
    normalized[key] = normalizeMetadataValue(recordValue);
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

function mapLead(value: unknown): LeadSummary | undefined {
  if (typeof value === 'string') {
    const leadId = readString(value);
    if (!leadId) {
      return undefined;
    }

    return {
      id: leadId,
      fullName: leadId,
      status: 'new',
    };
  }

  const leadRecord = toRecord(value);
  if (!leadRecord) {
    return undefined;
  }

  const leadId = readString(leadRecord.id);
  if (!leadId) {
    return undefined;
  }

  return {
    id: leadId,
    fullName: readString(leadRecord.full_name) || readString(leadRecord.fullName) || leadId,
    status:
      leadRecord.status === 'new' ||
      leadRecord.status === 'contacted' ||
      leadRecord.status === 'qualified' ||
      leadRecord.status === 'negotiating' ||
      leadRecord.status === 'converted' ||
      leadRecord.status === 'lost'
        ? leadRecord.status
        : 'new',
    phone: readString(leadRecord.phone) || undefined,
    username: readString(leadRecord.username) || undefined,
  };
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

export function mapCustomerDtoToModel(dto: CustomerDto): Customer {
  const nowIso = new Date().toISOString();
  const fullName = readString(dto.full_name) || readString(dto.fullName) || "Noma'lum mijoz";
  const phone = readString(dto.phone) || undefined;
  const email = readString(dto.email) || undefined;
  const addressLine = readString(dto.address);
  const notes = readString(dto.notes) || undefined;

  return {
    id: readString(dto.id) || `customer-${nowIso}`,
    fullName,
    username: undefined,
    contact: {
      phone,
      email,
      username: undefined,
    },
    address: addressLine
      ? {
          line1: addressLine,
        }
      : undefined,
    notes,
    metadata: mapMetadata(dto.metadata),
    lead: mapLead(dto.lead),
    assignedOperator: mapAssignedOperator(dto.assigned_operator),
    segments: [],
    totalOrders: 0,
    totalSpent: 0,
    currency: DEFAULT_CURRENCY_CODE,
    lastOrderAt: undefined,
    notesSummary: notes,
    createdAt: readString(dto.created_at, nowIso),
    updatedAt: readString(dto.updated_at, nowIso),
  };
}

export function mapCustomerListDtoToItems(value: unknown): Customer[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toRecord(item))
      .filter((item): item is CustomerDto => item !== null)
      .map((item) => mapCustomerDtoToModel(item));
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
    .filter((item): item is CustomerDto => item !== null)
    .map((item) => mapCustomerDtoToModel(item));
}
