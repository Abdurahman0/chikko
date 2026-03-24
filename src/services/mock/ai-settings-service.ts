import type { AISettingsService } from '../core/contracts';
import type {
  AISetting,
  AISettingMutationInput,
  AISettingPatchInput,
  AISettingsListParams,
} from '../../types/domain';
import { mockAuthService } from '../../auth/mock-auth-service';
import { mockDataStore } from './dataset';
import { findById, paginateItems, withMockDelay } from './helpers';

type AISettingOrderingField = 'created_at' | 'updated_at' | 'name' | 'temperature';

function resolveOrdering(params?: AISettingsListParams): {
  field: AISettingOrderingField;
  direction: 'asc' | 'desc';
} {
  const requestedOrdering = params?.ordering?.trim();
  if (requestedOrdering) {
    const direction = requestedOrdering.startsWith('-') ? 'desc' : 'asc';
    const field = requestedOrdering.replace('-', '');

    if (
      field === 'created_at' ||
      field === 'updated_at' ||
      field === 'name' ||
      field === 'temperature'
    ) {
      return { field, direction };
    }
  }

  const sortDirection = params?.sortDirection === 'asc' ? 'asc' : 'desc';
  const sortBy = params?.sortBy?.trim();
  if (sortBy === 'created_at' || sortBy === 'createdAt') {
    return { field: 'created_at', direction: sortDirection };
  }

  if (sortBy === 'updated_at' || sortBy === 'updatedAt') {
    return { field: 'updated_at', direction: sortDirection };
  }

  if (sortBy === 'name') {
    return { field: 'name', direction: sortDirection };
  }

  if (sortBy === 'temperature') {
    return { field: 'temperature', direction: sortDirection };
  }

  return { field: 'updated_at', direction: 'desc' };
}

function compareSettings(
  left: AISetting,
  right: AISetting,
  field: AISettingOrderingField,
): number {
  if (field === 'name') {
    return left.name.localeCompare(right.name);
  }

  if (field === 'temperature') {
    return left.temperature - right.temperature;
  }

  const leftValue = field === 'created_at' ? left.created_at : left.updated_at;
  const rightValue = field === 'created_at' ? right.created_at : right.updated_at;
  return new Date(leftValue).getTime() - new Date(rightValue).getTime();
}

function normalizeString(value: string): string {
  return value.trim();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveCurrentActorId(): string | null {
  const actor = mockAuthService.getCurrentUser();
  if (!actor) {
    return null;
  }

  return `managed-${actor.id}`;
}

function normalizeMutationInput(input: AISettingMutationInput): AISettingMutationInput {
  const name = normalizeString(input.name);
  const systemPrompt = normalizeString(input.system_prompt);
  const modelName = normalizeString(input.model_name);

  if (!name) {
    throw new Error('Konfiguratsiya nomi majburiy.');
  }

  if (!systemPrompt) {
    throw new Error('System prompt maydoni majburiy.');
  }

  if (!modelName) {
    throw new Error('Model nomi majburiy.');
  }

  return {
    name,
    system_prompt: systemPrompt,
    model_name: modelName,
    temperature: clamp(input.temperature, 0, 1),
    auto_order_enabled: input.auto_order_enabled,
    order_confidence_threshold: clamp(input.order_confidence_threshold, 0, 1),
    resume_after_operator_minutes: clamp(
      Math.round(input.resume_after_operator_minutes),
      1,
      180,
    ),
    is_active: input.is_active,
  };
}

function resolvePatchPayload(
  existing: AISetting,
  input: AISettingPatchInput,
): AISettingMutationInput {
  return {
    name: input.name ?? existing.name,
    system_prompt: input.system_prompt ?? existing.system_prompt,
    model_name: input.model_name ?? existing.model_name,
    temperature: input.temperature ?? existing.temperature,
    auto_order_enabled: input.auto_order_enabled ?? existing.auto_order_enabled,
    order_confidence_threshold:
      input.order_confidence_threshold ?? existing.order_confidence_threshold,
    resume_after_operator_minutes:
      input.resume_after_operator_minutes ?? existing.resume_after_operator_minutes,
    is_active: input.is_active ?? existing.is_active,
  };
}

function applyExclusiveActive(targetId: string, actorId: string | null): AISetting | null {
  const now = new Date().toISOString();
  let updated: AISetting | null = null;

  mockDataStore.aiSettings = mockDataStore.aiSettings.map((setting) => {
    const shouldBeActive = setting.id === targetId;
    if (setting.is_active === shouldBeActive) {
      return setting;
    }

    const nextSetting: AISetting = {
      ...setting,
      is_active: shouldBeActive,
      updated_at: now,
      updated_by: actorId,
    };
    if (shouldBeActive) {
      updated = nextSetting;
    }
    return nextSetting;
  });

  if (!updated) {
    updated = findById(mockDataStore.aiSettings, targetId);
  }

  return updated;
}

function ensureOneActiveConfig(actorId: string | null): void {
  if (mockDataStore.aiSettings.length === 0) {
    return;
  }

  const hasActive = mockDataStore.aiSettings.some((setting) => setting.is_active);
  if (hasActive) {
    return;
  }

  const now = new Date().toISOString();
  const fallback = mockDataStore.aiSettings[0]!;
  mockDataStore.aiSettings = mockDataStore.aiSettings.map((setting) =>
    setting.id === fallback.id
      ? {
          ...setting,
          is_active: true,
          updated_at: now,
          updated_by: actorId,
        }
      : setting,
  );
}

export const mockAISettingsService: AISettingsService = {
  async list(params) {
    return mockAISettingsService.listAISettings(params);
  },

  async getById(id) {
    return mockAISettingsService.getAISettingById(id);
  },

  async listAISettings(params) {
    const { field, direction } = resolveOrdering(params);
    const normalizedSearch = params?.search?.trim().toLowerCase();

    const filtered = mockDataStore.aiSettings.filter((setting) => {
      const matchesSearch =
        !normalizedSearch ||
        `${setting.name} ${setting.model_name} ${setting.system_prompt}`
          .toLowerCase()
          .includes(normalizedSearch);
      const matchesActive =
        typeof params?.is_active !== 'boolean' ||
        setting.is_active === params.is_active;

      return matchesSearch && matchesActive;
    });

    const sorted = [...filtered].sort((left, right) => {
      const compared = compareSettings(left, right, field);
      if (compared === 0) {
        return right.id.localeCompare(left.id);
      }

      return direction === 'asc' ? compared : -compared;
    });

    return withMockDelay(paginateItems(sorted, params), 170);
  },

  async getAISettingById(id) {
    return withMockDelay(findById(mockDataStore.aiSettings, id), 120);
  },

  async createAISetting(input) {
    const payload = normalizeMutationInput(input);
    const now = new Date().toISOString();
    const actorId = resolveCurrentActorId();

    const nextSetting: AISetting = {
      id: `ai-setting-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      created_at: now,
      updated_at: now,
      name: payload.name,
      system_prompt: payload.system_prompt,
      model_name: payload.model_name,
      temperature: payload.temperature,
      auto_order_enabled: payload.auto_order_enabled,
      order_confidence_threshold: payload.order_confidence_threshold,
      resume_after_operator_minutes: payload.resume_after_operator_minutes,
      is_active: Boolean(payload.is_active),
      updated_by: actorId,
    };

    if (nextSetting.is_active) {
      mockDataStore.aiSettings = mockDataStore.aiSettings.map((setting) =>
        setting.is_active
          ? {
              ...setting,
              is_active: false,
              updated_at: now,
              updated_by: actorId,
            }
          : setting,
      );
    }

    mockDataStore.aiSettings.unshift(nextSetting);
    ensureOneActiveConfig(actorId);
    return withMockDelay(nextSetting, 180);
  },

  async updateAISetting(id, input) {
    const index = mockDataStore.aiSettings.findIndex((setting) => setting.id === id);
    if (index < 0) {
      return withMockDelay(null, 120);
    }

    const payload = normalizeMutationInput(input);
    const actorId = resolveCurrentActorId();
    const now = new Date().toISOString();
    const current = mockDataStore.aiSettings[index]!;
    const nextSetting: AISetting = {
      ...current,
      name: payload.name,
      system_prompt: payload.system_prompt,
      model_name: payload.model_name,
      temperature: payload.temperature,
      auto_order_enabled: payload.auto_order_enabled,
      order_confidence_threshold: payload.order_confidence_threshold,
      resume_after_operator_minutes: payload.resume_after_operator_minutes,
      is_active: payload.is_active ?? current.is_active,
      updated_at: now,
      updated_by: actorId,
    };

    mockDataStore.aiSettings.splice(index, 1, nextSetting);

    if (nextSetting.is_active) {
      mockDataStore.aiSettings = mockDataStore.aiSettings.map((setting) => {
        if (setting.id === nextSetting.id || !setting.is_active) {
          return setting;
        }

        return {
          ...setting,
          is_active: false,
          updated_at: now,
          updated_by: actorId,
        };
      });
    }

    ensureOneActiveConfig(actorId);

    return withMockDelay(findById(mockDataStore.aiSettings, id), 170);
  },

  async patchAISetting(id, input) {
    const existing = findById(mockDataStore.aiSettings, id);
    if (!existing) {
      return withMockDelay(null, 120);
    }

    const merged = resolvePatchPayload(existing, input);
    return mockAISettingsService.updateAISetting(id, merged);
  },

  async deleteAISetting(id) {
    const index = mockDataStore.aiSettings.findIndex((setting) => setting.id === id);
    if (index < 0) {
      return withMockDelay(false, 120);
    }

    const target = mockDataStore.aiSettings[index]!;
    if (target.is_active) {
      throw new Error('Faol konfiguratsiyani o\'chirib bo\'lmaydi.');
    }

    mockDataStore.aiSettings.splice(index, 1);
    return withMockDelay(true, 130);
  },

  async setActiveAISetting(id) {
    const exists = mockDataStore.aiSettings.some((setting) => setting.id === id);
    if (!exists) {
      return withMockDelay(null, 120);
    }

    const nextActive = applyExclusiveActive(id, resolveCurrentActorId());
    return withMockDelay(nextActive, 150);
  },

  async getActiveAISetting() {
    return withMockDelay(
      mockDataStore.aiSettings.find((setting) => setting.is_active) ?? null,
      120,
    );
  },
};
