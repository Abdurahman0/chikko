import type { LeadService } from '../core/contracts';
import { createNotImplementedError } from './not-implemented';

export const apiLeadService: LeadService = {
  async list() {
    throw createNotImplementedError('LeadService', 'list');
  },
  async getById() {
    throw createNotImplementedError('LeadService', 'getById');
  },
  async create() {
    throw createNotImplementedError('LeadService', 'create');
  },
  async update() {
    throw createNotImplementedError('LeadService', 'update');
  },
  async patch() {
    throw createNotImplementedError('LeadService', 'patch');
  },
  async delete() {
    throw createNotImplementedError('LeadService', 'delete');
  },
};
