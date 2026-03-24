import type { IntegrationsService } from '../core/contracts';
import type {
  IntegrationConfig,
  IntegrationConfigListParams,
  IntegrationConfigMutationInput,
  IntegrationConfigPatchInput,
  IntegrationEvent,
  IntegrationEventListParams,
} from '../../types/domain';
import { mockAuthService } from '../../auth/mock-auth-service';
import { mockDataStore } from './dataset';
import { findById, paginateItems, withMockDelay } from './helpers';

type EventOrderingField =
  | 'created_at'
  | 'updated_at'
  | 'processing_attempts'
  | 'event_type';
type ConfigOrderingField =
  | 'created_at'
  | 'updated_at'
  | 'provider'
  | 'key'
  | 'label';

function resolveEventOrdering(params?: IntegrationEventListParams): {
  field: EventOrderingField;
  direction: 'asc' | 'desc';
} {
  const requestedOrdering = params?.ordering?.trim();
  if (requestedOrdering) {
    const direction = requestedOrdering.startsWith('-') ? 'desc' : 'asc';
    const field = requestedOrdering.replace('-', '');
    if (
      field === 'created_at' ||
      field === 'updated_at' ||
      field === 'processing_attempts' ||
      field === 'event_type'
    ) {
      return { field, direction };
    }
  }

  const sortBy = params?.sortBy?.trim();
  const sortDirection = params?.sortDirection === 'asc' ? 'asc' : 'desc';
  if (
    sortBy === 'createdAt' ||
    sortBy === 'created_at' ||
    sortBy === 'updatedAt' ||
    sortBy === 'updated_at' ||
    sortBy === 'processing_attempts' ||
    sortBy === 'event_type'
  ) {
    const normalized =
      sortBy === 'createdAt'
        ? 'created_at'
        : sortBy === 'updatedAt'
          ? 'updated_at'
          : (sortBy as EventOrderingField);
    return { field: normalized, direction: sortDirection };
  }

  return { field: 'created_at', direction: 'desc' };
}

function resolveConfigOrdering(params?: IntegrationConfigListParams): {
  field: ConfigOrderingField;
  direction: 'asc' | 'desc';
} {
  const requestedOrdering = params?.ordering?.trim();
  if (requestedOrdering) {
    const direction = requestedOrdering.startsWith('-') ? 'desc' : 'asc';
    const field = requestedOrdering.replace('-', '');
    if (
      field === 'created_at' ||
      field === 'updated_at' ||
      field === 'provider' ||
      field === 'key' ||
      field === 'label'
    ) {
      return { field, direction };
    }
  }

  const sortBy = params?.sortBy?.trim();
  const sortDirection = params?.sortDirection === 'asc' ? 'asc' : 'desc';
  if (
    sortBy === 'createdAt' ||
    sortBy === 'created_at' ||
    sortBy === 'updatedAt' ||
    sortBy === 'updated_at' ||
    sortBy === 'provider' ||
    sortBy === 'key' ||
    sortBy === 'label'
  ) {
    const normalized =
      sortBy === 'createdAt'
        ? 'created_at'
        : sortBy === 'updatedAt'
          ? 'updated_at'
          : (sortBy as ConfigOrderingField);
    return { field: normalized, direction: sortDirection };
  }

  return { field: 'updated_at', direction: 'desc' };
}

function compareEvents(
  left: IntegrationEvent,
  right: IntegrationEvent,
  field: EventOrderingField,
): number {
  if (field === 'processing_attempts') {
    return left.processing_attempts - right.processing_attempts;
  }

  if (field === 'event_type') {
    return left.event_type.localeCompare(right.event_type);
  }

  const leftValue = field === 'created_at' ? left.created_at : left.updated_at;
  const rightValue = field === 'created_at' ? right.created_at : right.updated_at;
  return new Date(leftValue).getTime() - new Date(rightValue).getTime();
}

function compareConfigs(
  left: IntegrationConfig,
  right: IntegrationConfig,
  field: ConfigOrderingField,
): number {
  if (field === 'provider') {
    return left.provider.localeCompare(right.provider);
  }

  if (field === 'key') {
    return left.key.localeCompare(right.key);
  }

  if (field === 'label') {
    return left.label.localeCompare(right.label);
  }

  const leftValue = field === 'created_at' ? left.created_at : left.updated_at;
  const rightValue = field === 'created_at' ? right.created_at : right.updated_at;
  return new Date(leftValue).getTime() - new Date(rightValue).getTime();
}

function normalizeString(value: string): string {
  return value.trim();
}

function assertCanManageIntegrations() {
  const actor = mockAuthService.getCurrentUser();
  if (!actor) {
    throw new Error('Authentication is required.');
  }

  if (actor.role === 'developer') {
    return actor;
  }

  if (!actor.permissionKeys.includes('can_manage_integrations')) {
    throw new Error('Forbidden action.');
  }

  return actor;
}

function assertUniqueConfig(provider: string, key: string, excludeId?: string) {
  const duplicated = mockDataStore.integrationConfigs.some(
    (config) =>
      config.provider === provider &&
      config.key.toLowerCase() === key.toLowerCase() &&
      config.id !== excludeId,
  );

  if (duplicated) {
    throw new Error('Ushbu provider uchun key allaqachon mavjud.');
  }
}

function normalizeConfigInput(input: IntegrationConfigMutationInput): IntegrationConfigMutationInput {
  const provider = input.provider;
  const key = normalizeString(input.key);
  const label = normalizeString(input.label);
  const value = normalizeString(input.value);

  if (!provider || !key || !label || !value) {
    throw new Error('Majburiy maydonlar to\'liq to\'ldirilmagan.');
  }

  return {
    provider,
    key,
    label,
    value,
    is_secret: input.is_secret,
    is_active: input.is_active,
  };
}

function resolvePatchPayload(
  existing: IntegrationConfig,
  input: IntegrationConfigPatchInput,
): IntegrationConfigMutationInput {
  return {
    provider: input.provider ?? existing.provider,
    key: input.key ?? existing.key,
    label: input.label ?? existing.label,
    value: input.value ?? existing.value,
    is_secret: input.is_secret ?? existing.is_secret,
    is_active: input.is_active ?? existing.is_active,
  };
}

export const mockIntegrationsService: IntegrationsService = {
  async listIntegrationEvents(params) {
    const { field, direction } = resolveEventOrdering(params);
    const normalizedSearch = params?.search?.trim().toLowerCase();

    const filtered = mockDataStore.integrationEvents.filter((event) => {
      const matchesSearch =
        !normalizedSearch ||
        `${event.external_id} ${event.event_type} ${event.event_key}`
          .toLowerCase()
          .includes(normalizedSearch);
      const matchesPlatform = !params?.platform || event.platform === params.platform;
      const matchesProcessed =
        typeof params?.processed !== 'boolean' || event.processed === params.processed;
      return matchesSearch && matchesPlatform && matchesProcessed;
    });

    const sorted = [...filtered].sort((left, right) => {
      const compared = compareEvents(left, right, field);
      if (compared === 0) {
        return right.id.localeCompare(left.id);
      }

      return direction === 'asc' ? compared : -compared;
    });

    return withMockDelay(paginateItems(sorted, params), 170);
  },

  async getIntegrationEventById(id) {
    return withMockDelay(findById(mockDataStore.integrationEvents, id), 120);
  },

  async listIntegrationConfigs(params) {
    const { field, direction } = resolveConfigOrdering(params);
    const normalizedSearch = params?.search?.trim().toLowerCase();

    const filtered = mockDataStore.integrationConfigs.filter((config) => {
      const matchesSearch =
        !normalizedSearch ||
        `${config.provider} ${config.key} ${config.label}`.toLowerCase().includes(normalizedSearch);
      const matchesProvider = !params?.provider || config.provider === params.provider;
      const matchesActive =
        typeof params?.is_active !== 'boolean' || config.is_active === params.is_active;
      const matchesSecret =
        typeof params?.is_secret !== 'boolean' || config.is_secret === params.is_secret;

      return matchesSearch && matchesProvider && matchesActive && matchesSecret;
    });

    const sorted = [...filtered].sort((left, right) => {
      const compared = compareConfigs(left, right, field);
      if (compared === 0) {
        return right.id.localeCompare(left.id);
      }

      return direction === 'asc' ? compared : -compared;
    });

    return withMockDelay(paginateItems(sorted, params), 170);
  },

  async getIntegrationConfigById(id) {
    return withMockDelay(findById(mockDataStore.integrationConfigs, id), 120);
  },

  async createIntegrationConfig(input) {
    const actor = assertCanManageIntegrations();
    const payload = normalizeConfigInput(input);
    assertUniqueConfig(payload.provider, payload.key);

    const now = new Date().toISOString();
    const created: IntegrationConfig = {
      id: `integration-config-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      created_at: now,
      updated_at: now,
      provider: payload.provider,
      key: payload.key,
      label: payload.label,
      value: payload.value,
      is_secret: payload.is_secret,
      is_active: payload.is_active,
      updated_by: `managed-${actor.id}`,
    };

    mockDataStore.integrationConfigs.unshift(created);
    return withMockDelay(created, 180);
  },

  async updateIntegrationConfig(id, input) {
    const actor = assertCanManageIntegrations();
    const index = mockDataStore.integrationConfigs.findIndex((config) => config.id === id);
    if (index < 0) {
      return withMockDelay(null, 120);
    }

    const payload = normalizeConfigInput(input);
    assertUniqueConfig(payload.provider, payload.key, id);

    const current = mockDataStore.integrationConfigs[index]!;
    const updated: IntegrationConfig = {
      ...current,
      provider: payload.provider,
      key: payload.key,
      label: payload.label,
      value: payload.value,
      is_secret: payload.is_secret,
      is_active: payload.is_active,
      updated_at: new Date().toISOString(),
      updated_by: `managed-${actor.id}`,
    };

    mockDataStore.integrationConfigs.splice(index, 1, updated);
    return withMockDelay(updated, 170);
  },

  async patchIntegrationConfig(id, input) {
    const existing = findById(mockDataStore.integrationConfigs, id);
    if (!existing) {
      return withMockDelay(null, 120);
    }

    const merged = resolvePatchPayload(existing, input);
    return this.updateIntegrationConfig(id, merged);
  },

  async deleteIntegrationConfig(id) {
    assertCanManageIntegrations();
    const index = mockDataStore.integrationConfigs.findIndex((config) => config.id === id);
    if (index < 0) {
      return withMockDelay(false, 120);
    }

    mockDataStore.integrationConfigs.splice(index, 1);
    return withMockDelay(true, 130);
  },
};
