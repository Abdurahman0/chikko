import type { ProductService } from '../core/contracts';
import type { Product, ProductMutationInput } from '../../types/domain';
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
  };
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

export const mockProductService: ProductService = {
  async list(params) {
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

    return withMockDelay(paginateItems(sortedItems, params), 210);
  },

  async getById(id) {
    return withMockDelay(findById(mockDataStore.products, id), 145);
  },

  async create(input) {
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
      metadata: {
        source: 'mock',
        created_via: 'products-form',
      },
      status: resolveStatus(payload.isActive, normalizedStockQuantity),
      imageUrl: undefined,
      createdAt: now,
      updatedAt: now,
    };

    mockDataStore.products.unshift(nextProduct);
    return withMockDelay(nextProduct, 180);
  },

  async update(id, input) {
    const existingIndex = mockDataStore.products.findIndex((product) => product.id === id);
    if (existingIndex < 0) {
      return withMockDelay(null, 150);
    }

    const payload = normalizePayload(input);
    assertUniqueSku(payload.sku, id);
    const normalizedStockQuantity = Math.max(0, Math.floor(payload.stockQuantity));

    const existing = mockDataStore.products[existingIndex]!;
    const nextProduct: Product = {
      ...existing,
      name: payload.name,
      sku: payload.sku,
      description: payload.description,
      price: Number(payload.price.toFixed(2)),
      currency: payload.currency,
      stockQuantity: normalizedStockQuantity,
      isActive: payload.isActive,
      status: resolveStatus(payload.isActive, normalizedStockQuantity),
      updatedAt: new Date().toISOString(),
    };

    mockDataStore.products.splice(existingIndex, 1, nextProduct);
    return withMockDelay(nextProduct, 170);
  },

  async delete(id) {
    const existingIndex = mockDataStore.products.findIndex((product) => product.id === id);
    if (existingIndex < 0) {
      return withMockDelay(false, 120);
    }

    mockDataStore.products.splice(existingIndex, 1);
    return withMockDelay(true, 140);
  },
};
