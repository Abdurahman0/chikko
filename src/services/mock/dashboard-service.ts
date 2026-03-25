import type { DashboardOverviewParams, DashboardService } from '../core/contracts';
import { getMockDashboardOverview } from './dataset';
import { withMockDelay } from './helpers';

export const mockDashboardService: DashboardService = {
  async getOverview(_params?: DashboardOverviewParams) {
    return withMockDelay(getMockDashboardOverview(), 140);
  },
};
