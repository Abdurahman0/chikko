import type { DashboardService } from '../core/contracts';
import { createNotImplementedError } from './not-implemented';

export const apiDashboardService: DashboardService = {
  async getOverview() {
    throw createNotImplementedError('DashboardService', 'getOverview');
  },
};
