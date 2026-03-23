import type { CustomerService } from '../core/contracts';
import { createNotImplementedError } from './not-implemented';

export const apiCustomerService: CustomerService = {
  async list() {
    throw createNotImplementedError('CustomerService', 'list');
  },
  async getById() {
    throw createNotImplementedError('CustomerService', 'getById');
  },
};
