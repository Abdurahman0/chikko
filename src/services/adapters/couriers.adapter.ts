import type {
  Courier,
  CourierOrder,
  CourierOrderStatus,
} from '../../types/domain';

export type CourierDto = Record<string, unknown>;
export type CourierOrderDto = Record<string, unknown>;

const ALLOWED_COURIER_ORDER_STATUSES: readonly CourierOrderStatus[] = [
  'pending',
  'assigned',
  'in_transit',
  'delivered',
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

function readNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) {
      return fallback;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
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
): Courier['metadata'] {
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

  const mapped: NonNullable<Courier['metadata']> = {};
  for (const [key, metadataValue] of Object.entries(record)) {
    mapped[key] = normalizeMetadataValue(metadataValue);
  }

  return Object.keys(mapped).length > 0 ? mapped : undefined;
}

function normalizeCourierOrderStatus(value: unknown): CourierOrderStatus {
  const normalized = readString(value) as CourierOrderStatus;
  return ALLOWED_COURIER_ORDER_STATUSES.includes(normalized)
    ? normalized
    : 'pending';
}

function mapOrderItems(value: unknown, orderId: string): NonNullable<CourierOrder['orderInfo']>['items'] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => {
    const item = toRecord(entry) ?? {};
    const fallbackId = `${orderId || 'order'}-item-${index}`;

    return {
      id: readString(item.id) || fallbackId,
      productId: readString(item.product) || readString(item.product_id) || undefined,
      productName: readString(item.product_name) || readString(item.productName) || undefined,
      productImageUrl:
        readString(item.product_image_url) ||
        readString(item.productImageUrl) ||
        undefined,
      quantity: readNumber(item.quantity),
      unitPrice: readNumber(item.unit_price ?? item.unitPrice),
      lineTotal: readNumber(item.line_total ?? item.lineTotal),
    };
  });
}

function mapOrderInfo(value: unknown): CourierOrder['orderInfo'] {
  const record = toRecord(value);
  if (!record) {
    return undefined;
  }

  const id = readString(record.id) || '';
  const items = mapOrderItems(record.items, id);

  return {
    id,
    status: readString(record.status) || undefined,
    contactName: readString(record.contact_name) || readString(record.contactName) || undefined,
    contactPhone: readString(record.contact_phone) || readString(record.contactPhone) || undefined,
    shippingAddress:
      readString(record.shipping_address) || readString(record.shippingAddress) || undefined,
    totalAmount: readNumber(record.total_amount ?? record.totalAmount),
    items,
  };
}

function resolveOrderDetailLabel(
  explicitOrderDetail: string,
  orderInfo: CourierOrder['orderInfo'],
  orderId: string,
  fallbackId: string,
): string | undefined {
  if (explicitOrderDetail) {
    return explicitOrderDetail;
  }

  const firstProductName = orderInfo?.items?.[0]?.productName?.trim();
  if (firstProductName) {
    return firstProductName;
  }

  const contactName = orderInfo?.contactName?.trim();
  if (contactName) {
    return contactName;
  }

  return orderId || fallbackId || undefined;
}

export function mapCourierDtoToModel(dto: CourierDto): Courier {
  const nowIso = new Date().toISOString();
  const id = readString(dto.id) || `courier-${nowIso}`;

  return {
    id,
    telegramUserId:
      readString(dto.telegram_user_id) ||
      readString(dto.telegramUserId),
    firstName:
      readString(dto.first_name) ||
      readString(dto.firstName) ||
      id,
    username: readString(dto.username) || undefined,
    phone: readString(dto.phone) || undefined,
    isActive: readBoolean(dto.is_active, true),
    metadata: mapMetadata(dto.metadata),
    createdAt: readString(dto.created_at) || readString(dto.createdAt) || nowIso,
    updatedAt: readString(dto.updated_at) || readString(dto.updatedAt) || nowIso,
  };
}

export function mapCourierListDtoToItems(value: unknown): Courier[] {
  const fromArray = (items: unknown[]): Courier[] =>
    items
      .map((item) => toRecord(item))
      .filter((item): item is CourierDto => item !== null)
      .map((item) => mapCourierDtoToModel(item));

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

export function mapCourierOrderDtoToModel(dto: CourierOrderDto): CourierOrder {
  const nowIso = new Date().toISOString();
  const id = readString(dto.id) || `courier-order-${nowIso}`;
  const orderInfo = mapOrderInfo(dto.order_detail ?? dto.orderDetail);
  const orderId = readString(dto.order) || readString(dto.order_id) || orderInfo?.id || '';
  const explicitOrderDetail =
    readString(dto.order_detail) ||
    readString(dto.orderDetail);
  const courierRecord = toRecord(dto.courier);

  return {
    id,
    orderId,
    orderDetail: resolveOrderDetailLabel(explicitOrderDetail, orderInfo, orderId, id),
    orderInfo,
    courier: courierRecord ? mapCourierDtoToModel(courierRecord) : undefined,
    status: normalizeCourierOrderStatus(dto.status),
    groupChatId:
      readString(dto.group_chat_id) ||
      readString(dto.groupChatId) ||
      undefined,
    groupThreadId:
      readString(dto.group_thread_id) ||
      readString(dto.groupThreadId) ||
      undefined,
    offerMessageId:
      readString(dto.offer_message_id) ||
      readString(dto.offerMessageId) ||
      undefined,
    activeMessageId:
      readString(dto.active_message_id) ||
      readString(dto.activeMessageId) ||
      undefined,
    awaitingCancelReason: readBoolean(dto.awaiting_cancel_reason, false),
    cancelReason: readString(dto.cancel_reason) || undefined,
    acceptedAt: readString(dto.accepted_at) || undefined,
    inTransitAt: readString(dto.in_transit_at) || undefined,
    deliveredAt: readString(dto.delivered_at) || undefined,
    cancelledAt: readString(dto.cancelled_at) || undefined,
    lastReminderAt: readString(dto.last_reminder_at) || undefined,
    metadata: mapMetadata(dto.metadata),
    createdAt: readString(dto.created_at) || readString(dto.createdAt) || nowIso,
    updatedAt: readString(dto.updated_at) || readString(dto.updatedAt) || nowIso,
  };
}

export function mapCourierOrderListDtoToItems(value: unknown): CourierOrder[] {
  const fromArray = (items: unknown[]): CourierOrder[] =>
    items
      .map((item) => toRecord(item))
      .filter((item): item is CourierOrderDto => item !== null)
      .map((item) => mapCourierOrderDtoToModel(item));

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
