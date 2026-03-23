import type { AuditInfo, CurrencyCode, EntityId } from './common';

export type ProductStatus = 'draft' | 'active' | 'out-of-stock' | 'archived';

export interface ProductSummary {
  id: EntityId;
  name: string;
  sku?: string;
  price: number;
  currency: CurrencyCode;
  imageUrl?: string;
}

export interface Product extends AuditInfo {
  id: EntityId;
  name: string;
  sku?: string;
  category?: string;
  price: number;
  promoPrice?: number;
  currency: CurrencyCode;
  stockQuantity?: number;
  status: ProductStatus;
  imageUrl?: string;
}
