import type { LogsService } from '../core/contracts';
import { createNotImplementedError } from './not-implemented';

export const apiLogsService: LogsService = {
  async listLogs() {
    throw createNotImplementedError('LogsService', 'listLogs');
  },

  async getLogById() {
    throw createNotImplementedError('LogsService', 'getLogById');
  },
};
