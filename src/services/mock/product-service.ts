import type { ProductService } from '../core/contracts';
import type {
  EntityId,
  Product,
  ProductImage,
  ProductMutationInput,
  ProductPatchInput,
} from '../../types/domain';
import { mockDataStore } from './dataset';
import { filterItemsBySearch, findById, paginateItems, withMockDelay } from './helpers';

type ProductOrdering = 'name' | 'price' | 'created_at';

function resolveStatus(isActive: boolean, stockQuantity: number): Product['status'] {
  if (!isActive) {
    return 'archived';
  }

  if (stockQuantity <= 0) {
    return 'out-of-stock';
  }

  return 'active';
}

function normalizePayload(input: ProductMutationInput): ProductMutationInput {
  return {
    ...input,
    name: input.name.trim(),
    sku: input.sku.trim().toUpperCase(),
    description: input.description.trim(),
    price: Number(input.price),
    stockQuantity: Number(input.stockQuantity),
    metadata: input.metadata ?? null,
  };
}

function normalizePatchPayload(input: ProductPatchInput): ProductPatchInput {
  const next: ProductPatchInput = { ...input };

  if (typeof next.name === 'string') {
    next.name = next.name.trim();
  }

  if (typeof next.sku === 'string') {
    next.sku = next.sku.trim().toUpperCase();
  }

  if (typeof next.description === 'string') {
    next.description = next.description.trim();
  }

  if (typeof next.price === 'number') {
    next.price = Number(next.price);
  }

  if (typeof next.stockQuantity === 'number') {
    next.stockQuantity = Number(next.stockQuantity);
  }

  return next;
}

function resolveOrdering(params?: Parameters<ProductService['list']>[0]): {
  field: ProductOrdering;
  direction: 'asc' | 'desc';
} {
  const ordering = params?.ordering?.trim();
  if (ordering) {
    const direction = ordering.startsWith('-') ? 'desc' : 'asc';
    const field = ordering.replace('-', '');

    if (field === 'name' || field === 'price' || field === 'created_at') {
      return { field, direction };
    }
  }

  const sortBy = params?.sortBy;
  const sortDirection = params?.sortDirection === 'asc' ? 'asc' : 'desc';

  if (sortBy === 'name' || sortBy === 'price' || sortBy === 'created_at' || sortBy === 'createdAt') {
    return {
      field: sortBy === 'createdAt' ? 'created_at' : sortBy,
      direction: sortDirection,
    };
  }

  return { field: 'created_at', direction: 'desc' };
}

function assertUniqueSku(sku: string, excludeId?: string) {
  const normalizedSku = sku.trim().toUpperCase();
  const duplicated = mockDataStore.products.some(
    (product) =>
      product.sku?.trim().toUpperCase() === normalizedSku &&
      product.id !== excludeId,
  );

  if (duplicated) {
    throw new Error('SKU must be unique.');
  }
}

function compareProducts(left: Product, right: Product, field: ProductOrdering): number {
  if (field === 'name') {
    return left.name.localeCompare(right.name);
  }

  if (field === 'price') {
    return left.price - right.price;
  }

  return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
}

function ensureImages(product: Product): ProductImage[] {
  if (Array.isArray(product.images)) {
    return product.images;
  }

  if (!product.imageUrl) {
    return [];
  }

  return [
    {
      id: `legacy-image-${product.id}`,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      sortOrder: 0,
      imageUrl: product.imageUrl,
      image: null,
    },
  ];
}

function withNormalizedImages(product: Product): Product {
  const images = ensureImages(product);

  return {
    ...product,
    images,
    imageUrl: images[0]?.imageUrl ?? product.imageUrl,
  };
}

function createMockImage(productId: EntityId, sortOrder: number): ProductImage {
  const now = new Date().toISOString();
  const suffix = Math.random().toString(36).slice(2, 8);

  return {
    id: `product-image-${productId}-${suffix}`,
    createdAt: now,
    updatedAt: now,
    sortOrder,
    image: null,
    imageUrl: `/mock/products/upload-${suffix}.jpg`,
  };
}

function getUploadCount(payload: FormData | File[]): number {
  if (Array.isArray(payload)) {
    return payload.length;
  }

  const files = payload.getAll('images');
  return files.length;
}

export const mockProductService: ProductService = {
  async list(params) {
    return mockProductService.listProducts(params);
  },

  async listProducts(params) {
    const currencyFilter = params?.currency;
    const isActiveFilter = params?.isActive ?? params?.is_active;
    const { field: orderingField, direction: orderingDirection } =
      resolveOrdering(params);

    const searchedItems = filterItemsBySearch(
      mockDataStore.products,
      params?.search,
      (product) =>
        `${product.name} ${product.sku ?? ''} ${product.description ?? ''}`,
    );

    const filteredItems = searchedItems.filter((product) => {
      const matchesCurrency = !currencyFilter || product.currency === currencyFilter;
      const matchesActive =
        typeof isActiveFilter !== 'boolean' || product.isActive === isActiveFilter;
      return matchesCurrency && matchesActive;
    });

    const sortedItems = [...filteredItems].sort((left, right) => {
      const compared = compareProducts(left, right, orderingField);
      if (compared === 0) {
        return right.updatedAt.localeCompare(left.updatedAt);
      }
      return orderingDirection === 'asc' ? compared : -compared;
    });

    const normalized = sortedItems.map((item) => withNormalizedImages(item));
    return withMockDelay(paginateItems(normalized, params), 210);
  },

  async getById(id) {
    return mockProductService.getProductById(id);
  },

  async getProductById(id) {
    const found = findById(mockDataStore.products, id);
    return withMockDelay(found ? withNormalizedImages(found) : null, 145);
  },

  async create(input) {
    return mockProductService.createProduct(input);
  },

  async createProduct(input) {
    const payload = normalizePayload(input);
    assertUniqueSku(payload.sku);
    const normalizedStockQuantity = Math.max(0, Math.floor(payload.stockQuantity));

    const now = new Date().toISOString();
    const nextProduct: Product = {
      id: `product-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: payload.name,
      sku: payload.sku,
      description: payload.description,
      category: 'General',
      price: Number(payload.price.toFixed(2)),
      promoPrice: undefined,
      currency: payload.currency,
      stockQuantity: normalizedStockQuantity,
      isActive: payload.isActive,
      embedding: null,
      metadata: payload.metadata ?? undefined,
      status: resolveStatus(payload.isActive, normalizedStockQuantity),
      imageUrl: undefined,
      images: [],
      createdAt: now,
      updatedAt: now,
    };

    mockDataStore.products.unshift(nextProduct);
    return withMockDelay(nextProduct, 180);
  },

  async update(id, input) {
    return mockProductService.updateProduct(id, input);
  },

  async updateProduct(id, input) {
    const existingIndex = mockDataStore.products.findIndex((product) => product.id === id);
    if (existingIndex < 0) {
      return withMockDelay(null, 150);
    }

    const payload = normalizePayload(input);
    assertUniqueSku(payload.sku, id);
    const normalizedStockQuantity = Math.max(0, Math.floor(payload.stockQuantity));

    const existing = mockDataStore.products[existingIndex]!;
    const nextProduct: Product = {
      ...withNormalizedImages(existing),
      name: payload.name,
      sku: payload.sku,
      description: payload.description,
      price: Number(payload.price.toFixed(2)),
      currency: payload.currency,
      stockQuantity: normalizedStockQuantity,
      isActive: payload.isActive,
      metadata: payload.metadata ?? undefined,
      status: resolveStatus(payload.isActive, normalizedStockQuantity),
      updatedAt: new Date().toISOString(),
    };
    nextProduct.imageUrl = nextProduct.images[0]?.imageUrl;

    mockDataStore.products.splice(existingIndex, 1, nextProduct);
    return withMockDelay(nextProduct, 170);
  },

  async patch(id, input) {
    return mockProductService.patchProduct(id, input);
  },

  async patchProduct(id, input) {
    const existingIndex = mockDataStore.products.findIndex((product) => product.id === id);
    if (existingIndex < 0) {
      return withMockDelay(null, 150);
    }

    const existing = withNormalizedImages(mockDataStore.products[existingIndex]!);
    const payload = normalizePatchPayload(input);

    if (payload.sku) {
      assertUniqueSku(payload.sku, id);
    }

    const stockQuantity = payload.stockQuantity !== undefined
      ? Math.max(0, Math.floor(payload.stockQuantity))
      : existing.stockQuantity ?? 0;
    const isActive = payload.isActive ?? existing.isActive;

    const nextProduct: Product = {
      ...existing,
      ...payload,
      stockQuantity,
      isActive,
      status: resolveStatus(isActive, stockQuantity),
      updatedAt: new Date().toISOString(),
    };
    nextProduct.imageUrl = nextProduct.images[0]?.imageUrl;

    mockDataStore.products.splice(existingIndex, 1, nextProduct);
    return withMockDelay(nextProduct, 160);
  },

  async delete(id) {
    return mockProductService.deleteProduct(id);
  },

  async deleteProduct(id) {
    const existingIndex = mockDataStore.products.findIndex((product) => product.id === id);
    if (existingIndex < 0) {
      return withMockDelay(false, 120);
    }

    mockDataStore.products.splice(existingIndex, 1);
    return withMockDelay(true, 140);
  },

  async uploadProductImages(productId, payload) {
    const existingIndex = mockDataStore.products.findIndex((product) => product.id === productId);
    if (existingIndex < 0) {
      return withMockDelay(null, 140);
    }

    const existing = withNormalizedImages(mockDataStore.products[existingIndex]!);
    const uploadCount = getUploadCount(payload);
    if (uploadCount <= 0) {
      return withMockDelay(existing, 120);
    }

    const nextImages = [...existing.images];
    for (let index = 0; index < uploadCount; index += 1) {
      nextImages.push(createMockImage(productId, nextImages.length));
    }

    const updated: Product = {
      ...existing,
      images: nextImages,
      imageUrl: nextImages[0]?.imageUrl,
      updatedAt: new Date().toISOString(),
    };

    mockDataStore.products.splice(existingIndex, 1, updated);
    return withMockDelay(updated, 180);
  },

  async deleteProductImage(productId, imageId) {
    const existingIndex = mockDataStore.products.findIndex((product) => product.id === productId);
    if (existingIndex < 0) {
      return withMockDelay(false, 120);
    }

    const existing = withNormalizedImages(mockDataStore.products[existingIndex]!);
    const filteredImages = existing.images.filter((image) => image.id !== imageId);
    if (filteredImages.length === existing.images.length) {
      return withMockDelay(false, 120);
    }

    const updated: Product = {
      ...existing,
      images: filteredImages.map((image, index) => ({
        ...image,
        sortOrder: index,
      })),
      imageUrl: filteredImages[0]?.imageUrl,
      updatedAt: new Date().toISOString(),
    };

    mockDataStore.products.splice(existingIndex, 1, updated);
    return withMockDelay(true, 130);
  },
};
