import type { ProductService } from '../core/contracts';
import { createNotImplementedError } from './not-implemented';

export const apiProductService: ProductService = {
  async list() {
    throw createNotImplementedError('ProductService', 'list');
  },
  async getById() {
    throw createNotImplementedError('ProductService', 'getById');
  },
  async create() {
    throw createNotImplementedError('ProductService', 'create');
  },
  async update() {
    throw createNotImplementedError('ProductService', 'update');
  },
  async delete() {
    throw createNotImplementedError('ProductService', 'delete');
  },
};
