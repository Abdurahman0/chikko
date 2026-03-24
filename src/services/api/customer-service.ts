import type { CustomerService } from '../core/contracts';
import { createNotImplementedError } from './not-implemented';

export const apiCustomerService: CustomerService = {
  async list() {
    throw createNotImplementedError('CustomerService', 'list');
  },
  async getById() {
    throw createNotImplementedError('CustomerService', 'getById');
  },
  async listCustomers() {
    throw createNotImplementedError('CustomerService', 'listCustomers');
  },
  async getCustomerById() {
    throw createNotImplementedError('CustomerService', 'getCustomerById');
  },
  async createCustomer() {
    throw createNotImplementedError('CustomerService', 'createCustomer');
  },
  async updateCustomer() {
    throw createNotImplementedError('CustomerService', 'updateCustomer');
  },
  async patchCustomer() {
    throw createNotImplementedError('CustomerService', 'patchCustomer');
  },
  async deleteCustomer() {
    throw createNotImplementedError('CustomerService', 'deleteCustomer');
  },
};
