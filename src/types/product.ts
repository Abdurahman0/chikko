import type { AuditInfo, CurrencyCode, EntityId } from './common';

export type ProductStatus = 'draft' | 'active' | 'out-of-stock' | 'archived';

export interface ProductImage extends AuditInfo {
  id: EntityId;
  sortOrder: number;
  image?: string | null;
  imageUrl: string;
}

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
  description?: string;
  category?: string;
  price: number;
  promoPrice?: number;
  currency: CurrencyCode;
  stockQuantity?: number;
  isActive: boolean;
  embedding?: number[] | null;
  metadata?: Record<string, string | number | boolean | null> | null;
  status: ProductStatus;
  imageUrl?: string;
  images: ProductImage[];
}

export interface ProductMutationInput {
  name: string;
  sku: string;
  description: string;
  price: number;
  currency: CurrencyCode;
  stockQuantity: number;
  isActive: boolean;
  metadata?: Record<string, string | number | boolean | null> | null;
}

export interface ProductPatchInput extends Partial<ProductMutationInput> {}
