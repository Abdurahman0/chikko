import type { Payment, PaymentMethod, PaymentStatus } from '../../types/domain';

export type PaymentDto = Record<string, unknown>;

const ALLOWED_PAYMENT_STATUSES: readonly PaymentStatus[] = [
  'pending',
  'approved',
  'rejected',
  'verified',
  'failed',
];

const ALLOWED_PAYMENT_METHODS: readonly PaymentMethod[] = [
  'manual',
  'payme',
  'click',
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

function readNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function normalizeStatus(value: unknown): PaymentStatus {
  const normalized = readString(value) as PaymentStatus;
  return ALLOWED_PAYMENT_STATUSES.includes(normalized) ? normalized : 'pending';
}

function normalizeMethod(value: unknown): PaymentMethod {
  const normalized = readString(value) as PaymentMethod;
  return ALLOWED_PAYMENT_METHODS.includes(normalized) ? normalized : 'manual';
}

function normalizeTimestamp(
  value: unknown,
  fallback: string,
): string {
  const source = readString(value);
  if (!source) {
    return fallback;
  }

  const parsed = new Date(source);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toISOString();
}

function normalizeOptionalTimestamp(value: unknown): string | null {
  const source = readString(value);
  if (!source) {
    return null;
  }

  const parsed = new Date(source);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function normalizeOptionalString(value: unknown): string | null {
  const normalized = readString(value);
  return normalized ? normalized : null;
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

function mapMetadata(value: unknown): Payment['metadata'] {
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
      return mapMetadata(parsed);
    } catch {
      return { raw: trimmed };
    }
  }

  const record = toRecord(value);
  if (!record) {
    return null;
  }

  const normalized: NonNullable<Payment['metadata']> = {};
  for (const [key, metadataValue] of Object.entries(record)) {
    normalized[key] = normalizeMetadataValue(metadataValue);
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

function mapOrderId(value: unknown): string {
  if (typeof value === 'string') {
    return readString(value);
  }

  const orderRecord = toRecord(value);
  if (!orderRecord) {
    return '';
  }

  return readString(orderRecord.id) || readString(orderRecord.order_id);
}

function mapReviewedBy(value: unknown): string | null {
  if (typeof value === 'string') {
    return normalizeOptionalString(value);
  }

  const reviewedByRecord = toRecord(value);
  if (!reviewedByRecord) {
    return null;
  }

  return (
    normalizeOptionalString(reviewedByRecord.id) ||
    normalizeOptionalString(reviewedByRecord.full_name) ||
    normalizeOptionalString(reviewedByRecord.fullName)
  );
}

export function mapPaymentDtoToModel(dto: PaymentDto): Payment {
  const nowIso = new Date().toISOString();
  const id = readString(dto.id) || `payment-${nowIso}`;
  const amount = Number(readNumber(dto.amount, 0).toFixed(2));

  return {
    id,
    created_at: normalizeTimestamp(dto.created_at, nowIso),
    updated_at: normalizeTimestamp(dto.updated_at, nowIso),
    amount,
    status: normalizeStatus(dto.status),
    method: normalizeMethod(dto.method),
    screenshot: normalizeOptionalString(dto.screenshot),
    last_four_digits: normalizeOptionalString(dto.last_four_digits),
    submitted_by_name:
      readString(dto.submitted_by_name) ||
      readString(dto.submittedByName) ||
      'Unknown',
    reviewed_at: normalizeOptionalTimestamp(dto.reviewed_at),
    metadata: mapMetadata(dto.metadata),
    verification_reference: normalizeOptionalString(dto.verification_reference),
    order: mapOrderId(dto.order),
    reviewed_by: mapReviewedBy(dto.reviewed_by),
  };
}

export function mapPaymentListDtoToItems(value: unknown): Payment[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toRecord(item))
      .filter((item): item is PaymentDto => item !== null)
      .map((item) => mapPaymentDtoToModel(item));
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
    .filter((item): item is PaymentDto => item !== null)
    .map((item) => mapPaymentDtoToModel(item));
}

