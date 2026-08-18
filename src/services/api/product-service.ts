import type { ProductService } from '../core/contracts';
import type {
  EntityId,
  PaginatedResult,
  ProductCategoryListParams,
  ProductCategoryMutationInput,
  ProductCategoryPatchInput,
  ProductBrandListParams,
  ProductBrandMutationInput,
  ProductBrandPatchInput,
  ProductMutationInput,
  ProductPatchInput,
  ProductPhotoImportInput,
  ProductPhotoImportOptions,
  TableQueryParams,
} from '../../types/domain';
import { apiClient } from '../../lib/api-client';
import { PRODUCT_PHOTO_IMPORT_TIMEOUT_MS } from '../../constants';
import {
  mapProductBrandDtoToModel,
  mapProductBrandListDtoToItems,
  mapProductCategoryDtoToModel,
  mapProductCategoryListDtoToItems,
  mapProductDtoToModel,
  mapProductListDtoToItems,
  mapProductPhotoImportMetadataDto,
  type ProductBrandDto,
  type ProductCategoryDto,
  type ProductDto,
} from '../adapters/product-adapter';

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

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toPaginatedResult<T>(
  allItems: T[],
  params?: { page?: number; pageSize?: number },
  totalItemsHint?: number | null,
): PaginatedResult<T> {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.max(1, params?.pageSize ?? 10);
  const start = (page - 1) * pageSize;
  const hasServerPaginationHint = typeof totalItemsHint === 'number' && totalItemsHint >= 0;

  const items = hasServerPaginationHint
    ? allItems
    : allItems.slice(start, start + pageSize);
  const totalItems = hasServerPaginationHint ? totalItemsHint : allItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return {
    items,
    meta: {
      page: Math.min(page, totalPages),
      pageSize,
      totalItems,
      totalPages,
    },
  };
}

function toMutationPayload(
  input: ProductMutationInput | ProductPatchInput,
  includeSku = true,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) {
    payload.name = input.name;
  }
  if (includeSku && input.sku !== undefined) {
    payload.sku = input.sku;
  }
  if (input.description !== undefined) {
    payload.description = input.description;
  }
  if (input.price !== undefined) {
    payload.price = input.price;
  }
  if (input.currency !== undefined) {
    payload.currency = input.currency;
  }
  if (input.stockQuantity !== undefined) {
    payload.stock_quantity = input.stockQuantity;
  }
  if (input.minimalStock !== undefined) {
    payload.minimal_stock = input.minimalStock;
  }
  if (input.isActive !== undefined) {
    payload.is_active = input.isActive;
  }
  if (input.isPromoted !== undefined) {
    payload.is_promoted = input.isPromoted;
  }
  if (input.reviewsEnabled !== undefined) {
    payload.reviews_enabled = input.reviewsEnabled;
  }
  if (input.categoryId !== undefined) {
    const normalizedCategoryId =
      typeof input.categoryId === 'string' ? input.categoryId.trim() : input.categoryId;
    payload.category_id = normalizedCategoryId;
    // Keep legacy key for backward compatibility with older API versions.
    payload.category = normalizedCategoryId;
  }
  if (input.brandId !== undefined) {
    const normalizedBrandId =
      typeof input.brandId === 'string' ? input.brandId.trim() : input.brandId;
    payload.brand_id = normalizedBrandId;
    // Keep legacy key if needed, though usually not for brands.
    payload.brand = normalizedBrandId;
  }
  return payload;
}

function toCategoryMutationPayload(
  input: ProductCategoryMutationInput | ProductCategoryPatchInput,
): FormData {
  const formData = new FormData();

  if (input.name !== undefined) {
    formData.append('name', input.name);
  }
  if (input.code !== undefined) {
    formData.append('code', input.code);
  }
  if (input.description !== undefined) {
    formData.append('description', input.description);
  }
  if (input.isActive !== undefined) {
    formData.append('is_active', String(input.isActive));
  }
  if (input.image !== undefined && input.image !== null) {
    formData.append('image', input.image);
  }
  return formData;
}

function toBrandMutationPayload(
  input: ProductBrandMutationInput | ProductBrandPatchInput,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) {
    payload.name = input.name;
  }
  if (input.code !== undefined) {
    payload.code = input.code;
  }
  if (input.description !== undefined) {
    payload.description = input.description;
  }
  if (input.isActive !== undefined) {
    payload.is_active = input.isActive;
  }
  return payload;
}

function toPhotoImportFormData(input: ProductPhotoImportInput): FormData {
  const formData = new FormData();

  formData.append('name', input.name);
  formData.append('image', input.image);

  // Both of these have server-side defaults that are unsafe for this flow
  // (is_active=true, price=0.00), so they are always sent explicitly.
  formData.append('is_active', String(input.isActive));
  formData.append('price', input.price.toFixed(2));

  if (input.categoryId) {
    formData.append('category_id', String(input.categoryId).trim());
  }
  if (input.brandId) {
    formData.append('brand_id', String(input.brandId).trim());
  }
  if (input.description !== undefined) {
    formData.append('description', input.description);
  }
  if (input.extractDescription !== undefined) {
    formData.append('extract_description', String(input.extractDescription));
  }
  if (input.currency !== undefined) {
    formData.append('currency', input.currency);
  }
  if (input.stockQuantity !== undefined) {
    formData.append('stock_quantity', String(Math.floor(input.stockQuantity)));
  }
  if (input.minimalStock !== undefined) {
    formData.append('minimal_stock', String(Math.floor(input.minimalStock)));
  }
  if (input.isPromoted !== undefined) {
    formData.append('is_promoted', String(input.isPromoted));
  }
  if (input.reviewsEnabled !== undefined) {
    formData.append('reviews_enabled', String(input.reviewsEnabled));
  }

  return formData;
}

function toImageUploadFormData(payload: FormData | File[]): FormData {
  if (payload instanceof FormData) {
    return payload;
  }

  const formData = new FormData();
  for (const file of payload) {
    formData.append('images', file);
  }

  return formData;
}

export const apiProductService: ProductService = {
  async list(params) {
    return apiProductService.listProducts(params);
  },

  async getById(id) {
    return apiProductService.getProductById(id);
  },

  async listProducts(params) {
    const { data } = await apiClient.get<unknown>('/api/products/', {
      params: {
        page: params?.page,
        page_size: params?.pageSize,
        search: params?.search,
        category: params?.category ?? params?.category_id,
        brand: params?.brand,
        currency: params?.currency,
        is_active: params?.isActive ?? params?.is_active,
        is_promoted: params?.isPromoted ?? params?.is_promoted,
        reviews_enabled:
          params?.reviewsEnabled ?? params?.reviews_enabled,
        ordering:
          params?.ordering ??
          (params?.sortBy
            ? `${params?.sortDirection === 'desc' ? '-' : ''}${params.sortBy}`
            : undefined),
      },
    });

    const items = mapProductListDtoToItems(data);
    const payload =
      data && typeof data === 'object' && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : null;
    const totalItemsHint = readNumber(payload?.count);

    return toPaginatedResult(items, params, totalItemsHint);
  },

  async getProductById(id) {
    const { data } = await apiClient.get<ProductDto>(`/api/products/${id}/`);
    return mapProductDtoToModel(data);
  },

  async create(input) {
    return apiProductService.createProduct(input);
  },

  async createProduct(input) {
    const { data } = await apiClient.post<ProductDto>(
      '/api/products/',
      toMutationPayload(input, false),
    );
    return mapProductDtoToModel(data);
  },

  async update(id, input) {
    return apiProductService.updateProduct(id, input);
  },

  async updateProduct(id, input) {
    const { data } = await apiClient.put<ProductDto>(
      `/api/products/${id}/`,
      toMutationPayload(input),
    );
    return mapProductDtoToModel(data);
  },

  async patch(id, input) {
    return apiProductService.patchProduct(id, input);
  },

  async patchProduct(id, input) {
    const { data } = await apiClient.patch<ProductDto>(
      `/api/products/${id}/`,
      toMutationPayload(input),
    );
    return mapProductDtoToModel(data);
  },

  async delete(id) {
    return apiProductService.deleteProduct(id);
  },

  async deleteProduct(id: EntityId) {
    await apiClient.delete(`/api/products/${id}/`);
    return true;
  },

  async listProductCategories(params?: ProductCategoryListParams) {
    const { data } = await apiClient.get<unknown>('/api/products/categories/', {
      params: {
        search: params?.search,
        ordering: params?.ordering,
        is_active: params?.isActive ?? params?.is_active,
      },
    });

    const items = mapProductCategoryListDtoToItems(data);

    // The new API returns a plain array; simulate pagination client-side.
    return toPaginatedResult(items, params);
  },

  async getProductCategoryById(id) {
    const { data } = await apiClient.get<ProductCategoryDto>(
      `/api/products/categories/${id}/`,
    );
    return mapProductCategoryDtoToModel(data);
  },

  async createProductCategory(input) {
    const { data } = await apiClient.post<ProductCategoryDto>(
      '/api/products/categories/',
      toCategoryMutationPayload(input),
    );
    return mapProductCategoryDtoToModel(data);
  },

  async updateProductCategory(id, input) {
    const { data } = await apiClient.put<ProductCategoryDto>(
      `/api/products/categories/${id}/`,
      toCategoryMutationPayload(input),
    );
    return mapProductCategoryDtoToModel(data);
  },

  async patchProductCategory(id, input) {
    const { data } = await apiClient.patch<ProductCategoryDto>(
      `/api/products/categories/${id}/`,
      toCategoryMutationPayload(input),
    );
    return mapProductCategoryDtoToModel(data);
  },

  async deleteProductCategory(id: EntityId) {
    await apiClient.delete(`/api/products/categories/${id}/`);
    return true;
  },

  async listProductBrands(params?: ProductBrandListParams) {
    const { data } = await apiClient.get<unknown>('/api/products/brands/', {
      params: {
        search: params?.search,
        ordering: params?.ordering,
        is_active: params?.isActive ?? params?.is_active,
      },
    });

    const items = mapProductBrandListDtoToItems(data);
    return toPaginatedResult(items, params);
  },

  async getProductBrandById(id) {
    const { data } = await apiClient.get<ProductBrandDto>(
      `/api/products/brands/${id}/`,
    );
    return mapProductBrandDtoToModel(data);
  },

  async createProductBrand(input) {
    const { data } = await apiClient.post<ProductBrandDto>(
      '/api/products/brands/',
      toBrandMutationPayload(input),
    );
    return mapProductBrandDtoToModel(data);
  },

  async updateProductBrand(id, input) {
    const { data } = await apiClient.put<ProductBrandDto>(
      `/api/products/brands/${id}/`,
      toBrandMutationPayload(input),
    );
    return mapProductBrandDtoToModel(data);
  },

  async patchProductBrand(id, input) {
    const { data } = await apiClient.patch<ProductBrandDto>(
      `/api/products/brands/${id}/`,
      toBrandMutationPayload(input),
    );
    return mapProductBrandDtoToModel(data);
  },

  async deleteProductBrand(id: EntityId) {
    await apiClient.delete(`/api/products/brands/${id}/`);
    return true;
  },

  async uploadProductImages(productId, payload) {
    const formData = toImageUploadFormData(payload);
    const { data } = await apiClient.post<unknown>(
      `/api/products/${productId}/upload-images/`,
      formData,
    );

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return mapProductDtoToModel(data as ProductDto);
    }

    return apiProductService.getProductById(productId);
  },

  async deleteProductImage(productId, imageId) {
    await apiClient.delete(`/api/products/${productId}/images/${imageId}/`);
    return true;
  },

  async createProductFromPhoto(
    input: ProductPhotoImportInput,
    options?: ProductPhotoImportOptions,
  ) {
    // Content-Type is intentionally not set: the browser adds the multipart boundary.
    const { data } = await apiClient.post<ProductDto>(
      '/api/products/from-photo/',
      toPhotoImportFormData(input),
      {
        timeout: options?.timeoutMs ?? PRODUCT_PHOTO_IMPORT_TIMEOUT_MS,
        signal: options?.signal,
        onUploadProgress: options?.onUploadProgress
          ? (event) => {
              options.onUploadProgress?.({
                loaded: event.loaded,
                total: typeof event.total === 'number' ? event.total : null,
              });
            }
          : undefined,
      },
    );

    return {
      product: mapProductDtoToModel(data),
      photoImport: mapProductPhotoImportMetadataDto(data),
    };
  },
};
