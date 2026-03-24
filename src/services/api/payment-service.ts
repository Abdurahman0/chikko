import type { PaymentService } from '../core/contracts';
import { createNotImplementedError } from './not-implemented';

export const apiPaymentService: PaymentService = {
  async list() {
    throw createNotImplementedError('PaymentService', 'list');
  },
  async getById() {
    throw createNotImplementedError('PaymentService', 'getById');
  },
  async listPayments() {
    throw createNotImplementedError('PaymentService', 'listPayments');
  },
  async getPaymentById() {
    throw createNotImplementedError('PaymentService', 'getPaymentById');
  },
  async createPayment() {
    throw createNotImplementedError('PaymentService', 'createPayment');
  },
  async updatePayment() {
    throw createNotImplementedError('PaymentService', 'updatePayment');
  },
  async deletePayment() {
    throw createNotImplementedError('PaymentService', 'deletePayment');
  },
  async approvePayment() {
    throw createNotImplementedError('PaymentService', 'approvePayment');
  },
  async rejectPayment() {
    throw createNotImplementedError('PaymentService', 'rejectPayment');
  },
  async verifyPayment() {
    throw createNotImplementedError('PaymentService', 'verifyPayment');
  },
};
