import type { ProductService } from '../core/contracts';
import { createNotImplementedError } from './not-implemented';

export const apiProductService: ProductService = {
  async list() {
    throw createNotImplementedError('ProductService', 'list');
  },
  async getById() {
    throw createNotImplementedError('ProductService', 'getById');
  },
};
