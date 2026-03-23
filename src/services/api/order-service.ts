import type { OrderService } from '../core/contracts';
import { createNotImplementedError } from './not-implemented';

export const apiOrderService: OrderService = {
  async list() {
    throw createNotImplementedError('OrderService', 'list');
  },
  async getById() {
    throw createNotImplementedError('OrderService', 'getById');
  },
};
