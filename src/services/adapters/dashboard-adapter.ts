import type { DashboardOverview } from '../core/contracts';

export type DashboardOverviewDto = Record<string, unknown>;

export function mapDashboardOverviewDtoToModel(
  _dto: DashboardOverviewDto,
): DashboardOverview {
  throw new Error('Not implemented: mapDashboardOverviewDtoToModel');
}
