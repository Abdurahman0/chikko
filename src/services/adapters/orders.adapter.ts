import { DEFAULT_CURRENCY_CODE } from '../../constants';
import type {
  CustomerSummary,
  LeadStatus,
  LeadSummary,
  Order,
  OrderItem,
  OrderPaymentStatus,
  OrderSource,
  OrderStatus,
  ProductSummary,
} from '../../types/domain';

export type OrderDto = Record<string, unknown>;
export type OrderItemDto = Record<string, unknown>;

const ALLOWED_ORDER_STATUSES: readonly OrderStatus[] = [
  'draft',
  'waiting_payment',
  'pending',
  'confirmed',
  'paid',
  'completed',
  'cancelled',
];

const ALLOWED_ORDER_SOURCES: readonly OrderSource[] = [
  'telegram',
  'instagram',
  'manual',
];

const ALLOWED_PAYMENT_STATUSES: readonly OrderPaymentStatus[] = [
  'unpaid',
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially-refunded',
];

const ALLOWED_LEAD_STATUSES: readonly LeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'negotiating',
  'converted',
  'lost',
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

function readInteger(value: unknown, fallback = 0): number {
  return Math.floor(readNumber(value, fallback));
}

function normalizeStatus(value: unknown): OrderStatus {
  const normalized = readString(value) as OrderStatus;
  return ALLOWED_ORDER_STATUSES.includes(normalized) ? normalized : 'draft';
}

function normalizeSource(value: unknown): OrderSource {
  const normalized = readString(value) as OrderSource;
  return ALLOWED_ORDER_SOURCES.includes(normalized) ? normalized : 'manual';
}

function normalizeLeadStatus(value: unknown): LeadStatus {
  const normalized = readString(value) as LeadStatus;
  return ALLOWED_LEAD_STATUSES.includes(normalized) ? normalized : 'new';
}

function normalizePaymentStatus(value: unknown): OrderPaymentStatus | undefined {
  const normalized = readString(value) as OrderPaymentStatus;
  return ALLOWED_PAYMENT_STATUSES.includes(normalized) ? normalized : undefined;
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
): Order['metadata'] {
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

  const mapped: NonNullable<Order['metadata']> = {};
  for (const [key, metadataValue] of Object.entries(record)) {
    mapped[key] = normalizeMetadataValue(metadataValue);
  }

  return Object.keys(mapped).length > 0 ? mapped : undefined;
}

function mapCustomerSummary(
  value: unknown,
  fallbackName: string,
): CustomerSummary | undefined {
  if (typeof value === 'string') {
    const id = readString(value);
    if (!id) {
      return undefined;
    }

    return {
      id,
      fullName: fallbackName || id,
    };
  }

  const customerRecord = toRecord(value);
  if (!customerRecord) {
    return undefined;
  }

  const id = readString(customerRecord.id);
  if (!id) {
    return undefined;
  }

  const fullName =
    readString(customerRecord.full_name) ||
    readString(customerRecord.fullName) ||
    readString(customerRecord.name) ||
    fallbackName ||
    id;

  return {
    id,
    fullName,
    phone: readString(customerRecord.phone) || readString(customerRecord.contact_phone) || undefined,
    username:
      readString(customerRecord.username) ||
      readString(customerRecord.instagram_username) ||
      readString(customerRecord.telegram_username) ||
      undefined,
  };
}

function mapLeadSummary(value: unknown): LeadSummary | undefined {
  if (typeof value === 'string') {
    const id = readString(value);
    if (!id) {
      return undefined;
    }

    return {
      id,
      fullName: id,
      status: 'new',
    };
  }

  const leadRecord = toRecord(value);
  if (!leadRecord) {
    return undefined;
  }

  const id = readString(leadRecord.id);
  if (!id) {
    return undefined;
  }

  return {
    id,
    fullName:
      readString(leadRecord.full_name) ||
      readString(leadRecord.fullName) ||
      readString(leadRecord.name) ||
      id,
    status: normalizeLeadStatus(leadRecord.status),
    phone: readString(leadRecord.phone) || undefined,
    username:
      readString(leadRecord.username) ||
      readString(leadRecord.instagram_username) ||
      readString(leadRecord.telegram_username) ||
      undefined,
  };
}

function mapProductSummary(
  value: unknown,
  fallbackId: string,
  fallbackUnitPrice: number,
): ProductSummary {
  if (typeof value === 'string') {
    const id = readString(value, fallbackId) || `product-${Date.now()}`;
    return {
      id,
      name: id,
      price: fallbackUnitPrice,
      currency: DEFAULT_CURRENCY_CODE,
    };
  }

  const productRecord = toRecord(value);
  if (!productRecord) {
    const id = fallbackId || `product-${Date.now()}`;
    return {
      id,
      name: id,
      price: fallbackUnitPrice,
      currency: DEFAULT_CURRENCY_CODE,
    };
  }

  const id =
    readString(productRecord.id) ||
    readString(productRecord.product_id) ||
    readString(productRecord.productId) ||
    fallbackId ||
    `product-${Date.now()}`;

  return {
    id,
    name:
      readString(productRecord.name) ||
      readString(productRecord.title) ||
      readString(productRecord.sku) ||
      id,
    sku: readString(productRecord.sku) || undefined,
    price: readNumber(productRecord.price, fallbackUnitPrice),
    currency: readString(productRecord.currency, DEFAULT_CURRENCY_CODE),
    imageUrl:
      readString(productRecord.image) ||
      readString(productRecord.imageUrl) ||
      readString(productRecord.image_url) ||
      undefined,
  };
}

function resolveLineTotal(
  dto: OrderItemDto,
  quantity: number,
  unitPrice: number,
): number {
  const explicitLineTotal = readNumber(
    dto.line_total ?? dto.lineTotal ?? dto.total_price ?? dto.totalPrice,
    Number((quantity * unitPrice).toFixed(2)),
  );

  return Number(explicitLineTotal.toFixed(2));
}

function mapOrderItemDtoToModel(
  dto: OrderItemDto,
  orderId: string,
  index: number,
): OrderItem {
  const quantity = Math.max(1, readInteger(dto.quantity, 1));
  const unitPrice = Number(
    readNumber(dto.unit_price ?? dto.unitPrice, 0).toFixed(2),
  );
  const productValue = dto.product ?? dto.product_id ?? dto.productId;
  const productFallbackId =
    readString(dto.product_id) || readString(dto.productId) || '';
  const product = mapProductSummary(productValue, productFallbackId, unitPrice);
  const lineTotal = resolveLineTotal(dto, quantity, unitPrice);

  return {
    id:
      readString(dto.id) ||
      `${orderId}-item-${String(index + 1).padStart(2, '0')}`,
    product,
    quantity,
    unitPrice,
    lineTotal,
    totalPrice: lineTotal,
  };
}

function mapItems(value: unknown, orderId: string): OrderItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => toRecord(item))
    .filter((item): item is OrderItemDto => item !== null)
    .map((item, index) => mapOrderItemDtoToModel(item, orderId, index));
}

export function mapOrderDtoToModel(dto: OrderDto): Order {
  const nowIso = new Date().toISOString();
  const id = readString(dto.id) || `order-${nowIso}`;
  const customer = mapCustomerSummary(
    dto.customer ?? dto.customer_id ?? dto.customerId,
    readString(dto.contact_name),
  );
  const lead = mapLeadSummary(dto.lead ?? dto.lead_id ?? dto.leadId);
  const items = mapItems(dto.items, id);
  const derivedTotal = Number(
    items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2),
  );
  const totalAmount = Number(
    readNumber(dto.total_amount ?? dto.totalAmount, derivedTotal).toFixed(2),
  );
  const notes = readString(dto.notes);
  const status = normalizeStatus(dto.status);

  return {
    id,
    customer,
    lead,
    status,
    source: normalizeSource(dto.source),
    contactName:
      readString(dto.contact_name) ||
      readString(dto.contactName) ||
      customer?.fullName ||
      '',
    contactPhone:
      readString(dto.contact_phone) ||
      readString(dto.contactPhone) ||
      customer?.phone ||
      '',
    shippingAddress:
      readString(dto.shipping_address) || readString(dto.shippingAddress) || '',
    notes: notes || undefined,
    metadata: mapMetadata(dto.metadata),
    aiGenerated: readBoolean(dto.ai_generated ?? dto.aiGenerated),
    totalAmount,
    currency:
      readString(dto.currency, '') ||
      items[0]?.product.currency ||
      DEFAULT_CURRENCY_CODE,
    items,
    orderNumber: readString(dto.order_number) || readString(dto.orderNumber) || undefined,
    orderStatus: normalizeStatus(dto.order_status ?? status),
    paymentStatus: normalizePaymentStatus(dto.payment_status ?? dto.paymentStatus),
    notesSummary: readString(dto.notes_summary) || notes || undefined,
    createdAt: readString(dto.created_at, nowIso),
    updatedAt: readString(dto.updated_at, nowIso),
  };
}

export function mapOrderListDtoToItems(value: unknown): Order[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toRecord(item))
      .filter((item): item is OrderDto => item !== null)
      .map((item) => mapOrderDtoToModel(item));
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
    .filter((item): item is OrderDto => item !== null)
    .map((item) => mapOrderDtoToModel(item));
}
