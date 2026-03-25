import type { Product, ProductImage } from '../../types/domain';

export type ProductDto = Record<string, unknown>;
export type ProductImageDto = Record<string, unknown>;

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
    const normalized = value.trim();
    if (!normalized) {
      return fallback;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function readInteger(value: unknown, fallback = 0): number {
  return Math.floor(readNumber(value, fallback));
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

function mapMetadata(
  value: unknown,
): Product['metadata'] {
  if (!value) {
    return undefined;
  }

  const record = toRecord(value);
  if (!record) {
    return undefined;
  }

  const mapped: Record<string, string | number | boolean | null> = {};
  for (const [key, metadataValue] of Object.entries(record)) {
    mapped[key] = normalizeMetadataValue(metadataValue);
  }

  return Object.keys(mapped).length > 0 ? mapped : undefined;
}

function resolveProductStatus(
  isActive: boolean,
  stockQuantity: number,
): Product['status'] {
  if (!isActive) {
    return 'archived';
  }

  if (stockQuantity <= 0) {
    return 'out-of-stock';
  }

  return 'active';
}

export function mapProductImageDtoToModel(
  dto: ProductImageDto,
  index = 0,
): ProductImage {
  const nowIso = new Date().toISOString();
  const imageUrl = readString(dto.image_url) || readString(dto.image);

  return {
    id: readString(dto.id) || `product-image-${nowIso}-${index}`,
    createdAt: readString(dto.created_at, nowIso),
    updatedAt: readString(dto.updated_at, nowIso),
    sortOrder: readInteger(dto.sort_order, index),
    image: readString(dto.image) || null,
    imageUrl,
  };
}

function mapImages(
  value: unknown,
): ProductImage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => toRecord(item))
    .filter((item): item is ProductImageDto => item !== null)
    .map((item, index) => mapProductImageDtoToModel(item, index))
    .filter((image) => image.imageUrl.length > 0);
}

export function mapProductDtoToModel(dto: ProductDto): Product {
  const nowIso = new Date().toISOString();
  const price = readNumber(dto.price, 0);
  const stockQuantity = readInteger(dto.stock_quantity, 0);
  const isActive = readBoolean(dto.is_active);
  const metadata = mapMetadata(dto.metadata);
  const images = mapImages(dto.images);
  const firstImageUrl = images[0]?.imageUrl || readString(dto.image_url) || undefined;
  const categoryFromMetadata =
    metadata?.category !== undefined &&
    metadata?.category !== null
      ? String(metadata.category).trim()
      : '';
  const categoryFromDto = readString(dto.category);

  return {
    id: readString(dto.id) || `product-${nowIso}`,
    name: readString(dto.name) || "Noma'lum mahsulot",
    sku: readString(dto.sku) || undefined,
    description: readString(dto.description) || undefined,
    category: categoryFromDto || categoryFromMetadata || undefined,
    price,
    promoPrice: undefined,
    currency: readString(dto.currency, 'UZS'),
    stockQuantity,
    isActive,
    embedding: null,
    metadata,
    status: resolveProductStatus(isActive, stockQuantity),
    imageUrl: firstImageUrl,
    images,
    createdAt: readString(dto.created_at, nowIso),
    updatedAt: readString(dto.updated_at, nowIso),
  };
}

export function mapProductListDtoToItems(value: unknown): Product[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toRecord(item))
      .filter((item): item is ProductDto => item !== null)
      .map((item) => mapProductDtoToModel(item));
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
    .filter((item): item is ProductDto => item !== null)
    .map((item) => mapProductDtoToModel(item));
}
