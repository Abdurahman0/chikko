import type { ServiceModuleKey } from './contracts';

export type DataSourceMode = 'mock' | 'api';

export interface ServiceDataSourceConfig {
  defaultMode: DataSourceMode;
  overrides?: Partial<Record<ServiceModuleKey, DataSourceMode>>;
}

export const SERVICE_DATA_SOURCE_CONFIG: ServiceDataSourceConfig = {
  defaultMode: 'mock',
  overrides: {},
};

export function resolveDataSourceMode(module: ServiceModuleKey): DataSourceMode {
  return SERVICE_DATA_SOURCE_CONFIG.overrides?.[module] ??
    SERVICE_DATA_SOURCE_CONFIG.defaultMode;
}
