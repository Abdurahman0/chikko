import type { IntegrationsService } from '../core/contracts';
import { createNotImplementedError } from './not-implemented';

export const apiIntegrationsService: IntegrationsService = {
  async listIntegrationEvents() {
    throw createNotImplementedError('IntegrationsService', 'listIntegrationEvents');
  },

  async getIntegrationEventById() {
    throw createNotImplementedError('IntegrationsService', 'getIntegrationEventById');
  },

  async listIntegrationConfigs() {
    throw createNotImplementedError('IntegrationsService', 'listIntegrationConfigs');
  },

  async getIntegrationConfigById() {
    throw createNotImplementedError('IntegrationsService', 'getIntegrationConfigById');
  },

  async createIntegrationConfig() {
    throw createNotImplementedError('IntegrationsService', 'createIntegrationConfig');
  },

  async updateIntegrationConfig() {
    throw createNotImplementedError('IntegrationsService', 'updateIntegrationConfig');
  },

  async patchIntegrationConfig() {
    throw createNotImplementedError('IntegrationsService', 'patchIntegrationConfig');
  },

  async deleteIntegrationConfig() {
    throw createNotImplementedError('IntegrationsService', 'deleteIntegrationConfig');
  },
};
