import type { AISettingsService } from '../core/contracts';
import { createNotImplementedError } from './not-implemented';

export const apiAISettingsService: AISettingsService = {
  async list() {
    throw createNotImplementedError('AISettingsService', 'list');
  },

  async getById() {
    throw createNotImplementedError('AISettingsService', 'getById');
  },

  async listAISettings() {
    throw createNotImplementedError('AISettingsService', 'listAISettings');
  },

  async getAISettingById() {
    throw createNotImplementedError('AISettingsService', 'getAISettingById');
  },

  async createAISetting() {
    throw createNotImplementedError('AISettingsService', 'createAISetting');
  },

  async updateAISetting() {
    throw createNotImplementedError('AISettingsService', 'updateAISetting');
  },

  async patchAISetting() {
    throw createNotImplementedError('AISettingsService', 'patchAISetting');
  },

  async deleteAISetting() {
    throw createNotImplementedError('AISettingsService', 'deleteAISetting');
  },

  async setActiveAISetting() {
    throw createNotImplementedError('AISettingsService', 'setActiveAISetting');
  },

  async getActiveAISetting() {
    throw createNotImplementedError('AISettingsService', 'getActiveAISetting');
  },
};
