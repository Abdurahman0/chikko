import type { Agent, AgentProduct } from '../../types/domain';

export type AgentDto = Record<string, unknown>;

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

function readBoolean(value: unknown, fallback = false): boolean {
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

function mapMetadata(
  value: unknown,
): Agent['metadata'] {
  if (value == null) {
    return undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return mapMetadata(parsed);
    } catch {
      return { raw: trimmed };
    }
  }

  const record = toRecord(value);
  if (!record) {
    return undefined;
  }

  const mapped: NonNullable<Agent['metadata']> = {};
  for (const [key, metadataValue] of Object.entries(record)) {
    mapped[key] = normalizeMetadataValue(metadataValue);
  }

  return Object.keys(mapped).length > 0 ? mapped : undefined;
}

function mapProductDtoToModel(value: unknown, fallbackKey: string): AgentProduct {
  const record = toRecord(value) ?? {};
  const nowIso = new Date().toISOString();

  return {
    id: readString(record.id) || `${fallbackKey}-${nowIso}`,
    name: readString(record.name) || fallbackKey,
    sku: readString(record.sku) || undefined,
    isActive: readBoolean(record.is_active ?? record.isActive, true),
  };
}

function mapProducts(value: unknown, agentId: string): AgentProduct[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) =>
    mapProductDtoToModel(entry, `${agentId || 'agent'}-product-${index}`),
  );
}

export function mapAgentDtoToModel(dto: AgentDto): Agent {
  const nowIso = new Date().toISOString();
  const id = readString(dto.id) || `agent-${nowIso}`;

  return {
    id,
    fullName:
      readString(dto.full_name) ||
      readString(dto.fullName) ||
      id,
    phone: readString(dto.phone) || undefined,
    telegramChatId:
      readString(dto.telegram_chat_id) ||
      readString(dto.telegramChatId) ||
      undefined,
    telegramUsername:
      readString(dto.telegram_username) ||
      readString(dto.telegramUsername) ||
      undefined,
    isActive: readBoolean(dto.is_active ?? dto.isActive, true),
    products: mapProducts(dto.products, id),
    metadata: mapMetadata(dto.metadata),
    createdAt: readString(dto.created_at) || readString(dto.createdAt) || nowIso,
    updatedAt: readString(dto.updated_at) || readString(dto.updatedAt) || nowIso,
  };
}

export function mapAgentListDtoToItems(value: unknown): Agent[] {
  const fromArray = (items: unknown[]): Agent[] =>
    items
      .map((item) => toRecord(item))
      .filter((item): item is AgentDto => item !== null)
      .map((item) => mapAgentDtoToModel(item));

  if (Array.isArray(value)) {
    return fromArray(value);
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

  return fromArray(items);
}
