import type { AuditInfo, CurrencyCode, EntityId } from './common';

export type ProductStatus = 'draft' | 'active' | 'out-of-stock' | 'archived';

export interface ProductCategory extends AuditInfo {
  id: EntityId;
  name: string;
  code: string;
  description?: string;
  image?: string | null;
  imageUrl?: string;
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
  image?: File | null;
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
  category?: ProductCategory;
  brandId?: EntityId;
  brandName?: string;
  brand?: ProductBrand;
  price: number;
  promoPrice?: number;
  currency: CurrencyCode;
  stockQuantity?: number;
  minimalStock?: number;
  isPromoted: boolean;
  reviewsEnabled: boolean;
  isActive: boolean;
  embedding?: number[] | null;
  metadata?: Record<string, string | number | boolean | null> | null;
  status: ProductStatus;
  imageUrl?: string;
  images: ProductImage[];
}

export interface ProductMutationInput {
  name: string;
  sku?: string;
  description: string;
  categoryId?: EntityId | null;
  brandId?: EntityId | null;
  price: number;
  currency: CurrencyCode;
  stockQuantity: number;
  minimalStock: number;
  isPromoted: boolean;
  reviewsEnabled: boolean;
  isActive: boolean;
}

export interface ProductPatchInput extends Partial<ProductMutationInput> {}

/**
 * Input for POST /api/products/from-photo/.
 *
 * `price` and `isActive` are required even though the endpoint defaults them
 * (0.00 / true): the endpoint creates the product immediately, so this flow must
 * never rely on those defaults. See ProductPhotoImportPanel.
 */
export interface ProductPhotoImportInput {
  name: string;
  image: File;
  isActive: boolean;
  price: number;
  categoryId?: EntityId | null;
  brandId?: EntityId | null;
  description?: string;
  extractDescription?: boolean;
  currency?: CurrencyCode;
  stockQuantity?: number;
  minimalStock?: number;
  isPromoted?: boolean;
  reviewsEnabled?: boolean;
}

/**
 * `metadata.photo_import` from the response. `null` means the backend did not
 * report the flag at all, which is not the same as an explicit `false`.
 */
export interface ProductPhotoImportMetadata {
  backgroundRemoved: boolean | null;
  ocrAvailable: boolean | null;
  descriptionExtracted: boolean | null;
}

export interface ProductPhotoImportResult {
  product: Product;
  photoImport: ProductPhotoImportMetadata;
}

export interface ProductPhotoImportOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  onUploadProgress?: (progress: { loaded: number; total: number | null }) => void;
}

export interface ProductBrand extends AuditInfo {
  id: EntityId;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

export interface ProductBrandListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  ordering?: string;
  isActive?: boolean;
  is_active?: boolean;
}

export interface ProductBrandMutationInput {
  name: string;
  code: string;
  description?: string;
  isActive?: boolean;
}

export interface ProductBrandPatchInput
  extends Partial<ProductBrandMutationInput> {}
