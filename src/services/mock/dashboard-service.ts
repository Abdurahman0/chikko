import type { DashboardService } from '../core/contracts';
import { getMockDashboardOverview } from './dataset';
import { withMockDelay } from './helpers';

export const mockDashboardService: DashboardService = {
  async getOverview() {
    return withMockDelay(getMockDashboardOverview(), 140);
  },
};
