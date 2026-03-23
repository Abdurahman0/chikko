import type { OrderService } from '../core/contracts';
import { createNotImplementedError } from './not-implemented';

export const apiOrderService: OrderService = {
  async list() {
    throw createNotImplementedError('OrderService', 'list');
  },
  async getById() {
    throw createNotImplementedError('OrderService', 'getById');
  },
  async create() {
    throw createNotImplementedError('OrderService', 'create');
  },
  async update() {
    throw createNotImplementedError('OrderService', 'update');
  },
  async patch() {
    throw createNotImplementedError('OrderService', 'patch');
  },
  async delete() {
    throw createNotImplementedError('OrderService', 'delete');
  },
  async recalculate() {
    throw createNotImplementedError('OrderService', 'recalculate');
  },
};
