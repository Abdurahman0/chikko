import type { LeadService } from '../core/contracts';
import { createNotImplementedError } from './not-implemented';

export const apiLeadService: LeadService = {
  async list() {
    throw createNotImplementedError('LeadService', 'list');
  },
  async getById() {
    throw createNotImplementedError('LeadService', 'getById');
  },
};
