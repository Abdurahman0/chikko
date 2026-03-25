import type { ChatMessage, Conversation } from '../../types/domain';

export type ConversationDto = Record<string, unknown>;
export type ChatMessageDto = Record<string, unknown>;

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

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

const DEBUG_CONTENT_START_PATTERN =
  /\b(?:sender|recipient|timestamp|ai_processed|delivered|generated_by|public_base_url|product_image_ids)\s*:/i;

function sanitizeVisibleMessageContent(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const debugStartIndex = trimmed.search(DEBUG_CONTENT_START_PATTERN);
  if (debugStartIndex > 0) {
    return trimmed.slice(0, debugStartIndex).trim();
  }

  return trimmed;
}

function extractContentFromPayloadRecord(record: Record<string, unknown> | null): string {
  if (!record) {
    return '';
  }

  const directText =
    readString(record.text) ||
    readString(record.content) ||
    readString(record.body);
  if (directText) {
    return sanitizeVisibleMessageContent(directText);
  }

  const nestedMessage = toRecord(record.message);
  if (nestedMessage) {
    const nestedText =
      readString(nestedMessage.text) ||
      readString(nestedMessage.content) ||
      readString(nestedMessage.body);
    if (nestedText) {
      return sanitizeVisibleMessageContent(nestedText);
    }
  }

  return '';
}

function readMessageContent(dto: ChatMessageDto): string {
  const rawContent = readString(dto.content);
  const directContent = sanitizeVisibleMessageContent(rawContent);
  if (directContent) {
    return directContent;
  }

  const parsedFromContent =
    rawContent.startsWith('{') || rawContent.startsWith('[')
      ? (() => {
          try {
            return extractContentFromPayloadRecord(toRecord(JSON.parse(rawContent) as unknown));
          } catch {
            return '';
          }
        })()
      : '';
  if (parsedFromContent) {
    return parsedFromContent;
  }

  const metadataRecord = toRecord(dto.metadata);
  const metadataText = extractContentFromPayloadRecord(metadataRecord);
  if (metadataText) {
    return metadataText;
  }

  return '';
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
): ChatMessage['metadata'] {
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
        const mapped: Record<string, string | number | boolean | null> = {};
        for (const [key, metadataValue] of Object.entries(parsedRecord)) {
          mapped[key] = normalizeMetadataValue(metadataValue);
        }
        return Object.keys(mapped).length > 0 ? mapped : null;
      }
    } catch {
      // Preserve raw metadata string.
    }

    return { raw: trimmed };
  }

  const record = toRecord(value);
  if (!record) {
    if (Array.isArray(value)) {
      try {
        return { raw: JSON.stringify(value) };
      } catch {
        return null;
      }
    }
    return null;
  }

  const mapped: Record<string, string | number | boolean | null> = {};
  for (const [key, metadataValue] of Object.entries(record)) {
    mapped[key] = normalizeMetadataValue(metadataValue);
  }

  return Object.keys(mapped).length > 0 ? mapped : null;
}

function resolveChannel(value: unknown): Conversation['channel'] {
  if (value === 'telegram' || value === 'instagram' || value === 'web' || value === 'manual') {
    return value;
  }

  return 'manual';
}

function resolveSenderType(value: unknown): ChatMessage['sender_type'] {
  if (value === 'customer' || value === 'ai' || value === 'operator' || value === 'system') {
    return value;
  }

  return 'system';
}

function resolveDirection(value: unknown): ChatMessage['direction'] {
  if (value === 'incoming' || value === 'outgoing') {
    return value;
  }

  return 'incoming';
}

function resolveConversationState(
  dto: ConversationDto,
  stateData: Record<string, unknown> | null,
): Conversation['state'] {
  const candidates = [
    dto.state_status,
    dto.status,
    stateData?.status,
    stateData?.session_status,
  ];

  for (const candidate of candidates) {
    if (candidate === 'open' || candidate === 'pending' || candidate === 'resolved') {
      return candidate;
    }

    if (candidate === 'closed') {
      return 'resolved';
    }
  }

  return 'open';
}

function mapLeadSummary(value: unknown): Conversation['lead'] {
  if (typeof value === 'string') {
    const id = readString(value);
    return id
      ? { id, fullName: id, status: 'new' }
      : null;
  }

  const record = toRecord(value);
  if (!record) {
    return null;
  }

  const id = readString(record.id);
  if (!id) {
    return null;
  }

  return {
    id,
    fullName: readString(record.fullName) || readString(record.full_name) || id,
    status:
      record.status === 'new' ||
      record.status === 'contacted' ||
      record.status === 'qualified' ||
      record.status === 'negotiating' ||
      record.status === 'converted' ||
      record.status === 'lost'
        ? record.status
        : 'new',
    phone: readString(record.phone) || undefined,
    username: readString(record.username) || undefined,
  };
}

function mapCustomerSummary(value: unknown): Conversation['customer'] {
  if (typeof value === 'string') {
    const id = readString(value);
    return id
      ? { id, fullName: id }
      : null;
  }

  const record = toRecord(value);
  if (!record) {
    return null;
  }

  const id = readString(record.id);
  if (!id) {
    return null;
  }

  return {
    id,
    fullName: readString(record.fullName) || readString(record.full_name) || id,
    phone: readString(record.phone) || undefined,
    username: readString(record.username) || undefined,
  };
}

function mapUserSummary(value: unknown): Conversation['assigned_operator'] {
  if (typeof value === 'string') {
    const id = readString(value);
    return id
      ? { id, fullName: id, role: 'operator' }
      : null;
  }

  const record = toRecord(value);
  if (!record) {
    return null;
  }

  const id = readString(record.id);
  if (!id) {
    return null;
  }

  return {
    id,
    fullName: readString(record.fullName) || readString(record.full_name) || id,
    role:
      record.role === 'developer' || record.role === 'admin' || record.role === 'operator'
        ? record.role
        : 'operator',
    avatarUrl: readString(record.avatarUrl) || readString(record.avatar_url) || undefined,
  };
}

export function mapConversationDtoToModel(dto: ConversationDto): Conversation {
  const nowIso = new Date().toISOString();
  const sessionId = readString(dto.id) || `session-${nowIso}`;
  const stateValue = toRecord(dto.state);
  const stateData =
    stateValue ??
    toRecord(dto.state_data) ??
    toRecord(dto.session_state) ??
    null;

  const rawLastMessage = dto.last_message;
  const lastMessagePayload = toRecord(rawLastMessage)
    ? mapChatMessageDtoToModel(toRecord(rawLastMessage) as ChatMessageDto, sessionId)
    : null;
  const sanitizedRawLastMessage = sanitizeVisibleMessageContent(readString(rawLastMessage));
  const lastMessageContent =
    lastMessagePayload?.content ??
    (sanitizedRawLastMessage || null);
  const explicitUnreadCount = readNumber(dto.unread_count) ?? readNumber(stateData?.unread_count);
  const inferredUnreadCount =
    lastMessagePayload &&
    lastMessagePayload.direction === 'incoming' &&
    lastMessagePayload.sender_type === 'customer' &&
    !lastMessagePayload.is_read
      ? 1
      : 0;

  return {
    id: sessionId,
    channel: resolveChannel(dto.channel),
    external_id: readString(dto.external_id) || null,
    lead: mapLeadSummary(dto.lead),
    customer: mapCustomerSummary(dto.customer),
    assigned_operator: mapUserSummary(dto.assigned_operator),
    ai_paused_until: readString(dto.ai_paused_until) || null,
    is_operator_active: readBoolean(dto.is_operator_active),
    last_message_at: readString(dto.last_message_at) || null,
    state: resolveConversationState(dto, stateData),
    state_data: stateData,
    last_message: lastMessageContent,
    last_message_payload: lastMessagePayload,
    unread_count: explicitUnreadCount ?? inferredUnreadCount,
    created_at: readString(dto.created_at, nowIso),
    updated_at: readString(dto.updated_at, nowIso),
  };
}

export function mapChatMessageDtoToModel(
  dto: ChatMessageDto,
  sessionIdFallback?: string,
): ChatMessage {
  const nowIso = new Date().toISOString();
  const id = readString(dto.id) || `message-${nowIso}`;

  return {
    id,
    created_at: readString(dto.created_at, nowIso),
    updated_at: readString(dto.updated_at, nowIso),
    sender_type: resolveSenderType(dto.sender_type),
    direction: resolveDirection(dto.direction),
    content: readMessageContent(dto),
    external_message_id: readString(dto.external_message_id) || null,
    metadata: mapMetadata(dto.metadata),
    is_read: readBoolean(dto.is_read),
    session: readString(dto.session) || sessionIdFallback || '',
    sent_by: mapUserSummary(dto.sent_by),
  };
}

export function mapConversationListDtoToItems(payload: unknown): Conversation[] {
  if (Array.isArray(payload)) {
    return payload
      .map((item) => toRecord(item))
      .filter((item): item is ConversationDto => item !== null)
      .map((item) => mapConversationDtoToModel(item));
  }

  const record = toRecord(payload);
  if (!record) {
    return [];
  }

  const items = Array.isArray(record.results)
    ? record.results
    : Array.isArray(record.items)
      ? record.items
      : [];

  return items
    .map((item) => toRecord(item))
    .filter((item): item is ConversationDto => item !== null)
    .map((item) => mapConversationDtoToModel(item));
}

export function mapMessageListDtoToItems(payload: unknown): ChatMessage[] {
  if (Array.isArray(payload)) {
    return payload
      .map((item) => toRecord(item))
      .filter((item): item is ChatMessageDto => item !== null)
      .map((item) => mapChatMessageDtoToModel(item));
  }

  const record = toRecord(payload);
  if (!record) {
    return [];
  }

  const items = Array.isArray(record.results)
    ? record.results
    : Array.isArray(record.items)
      ? record.items
      : [];

  return items
    .map((item) => toRecord(item))
    .filter((item): item is ChatMessageDto => item !== null)
    .map((item) => mapChatMessageDtoToModel(item));
}
