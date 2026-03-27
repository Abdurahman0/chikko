import type { AuditInfo, CurrencyCode, EntityId } from './common';

export type ProductStatus = 'draft' | 'active' | 'out-of-stock' | 'archived';

export interface ProductCategory extends AuditInfo {
  id: EntityId;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

export interface ProductCategoryListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  ordering?: string;
  isActive?: boolean;
  is_active?: boolean;
}

export interface ProductCategoryMutationInput {
  name: string;
  code: string;
  description?: string;
  isActive?: boolean;
}

export interface ProductCategoryPatchInput
  extends Partial<ProductCategoryMutationInput> {}

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
  categoryId?: EntityId;
  categoryName?: string;
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
  categoryId?: EntityId | null;
  price: number;
  currency: CurrencyCode;
  stockQuantity: number;
  isActive: boolean;
}

export interface ProductPatchInput extends Partial<ProductMutationInput> {}
