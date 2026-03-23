import type { Product } from '../../types/domain';

export type ProductDto = Record<string, unknown>;

export function mapProductDtoToModel(_dto: ProductDto): Product {
  throw new Error('Not implemented: mapProductDtoToModel');
}
