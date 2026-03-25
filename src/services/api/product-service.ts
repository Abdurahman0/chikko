import type { ProductService } from '../core/contracts';
import type {
  EntityId,
  PaginatedResult,
  Product,
  ProductMutationInput,
  ProductPatchInput,
  TableQueryParams,
} from '../../types/domain';
import { apiClient } from '../../lib/api-client';
import {
  mapProductDtoToModel,
  mapProductListDtoToItems,
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

function toPaginatedResult(
  allItems: Product[],
  params?: TableQueryParams,
  totalItemsHint?: number | null,
): PaginatedResult<Product> {
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
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) {
    payload.name = input.name;
  }
  if (input.sku !== undefined) {
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
  if (input.isActive !== undefined) {
    payload.is_active = input.isActive;
  }
  if (input.metadata !== undefined) {
    payload.metadata = input.metadata;
  }

  return payload;
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
        currency: params?.currency,
        is_active: params?.isActive ?? params?.is_active,
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
    const { data } = await apiClient.post<ProductDto>('/api/products/', toMutationPayload(input));
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
};
