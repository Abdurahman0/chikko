import type { PaymentService } from '../core/contracts';
import { createNotImplementedError } from './not-implemented';

export const apiPaymentService: PaymentService = {
  async list() {
    throw createNotImplementedError('PaymentService', 'list');
  },
  async getById() {
    throw createNotImplementedError('PaymentService', 'getById');
  },
};
