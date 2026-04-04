import { apiClient } from '../../lib/api-client';
import type {
  Agent,
  AgentListParams,
  AgentMutationInput,
  AgentPatchInput,
  EntityId,
  PaginatedResult,
} from '../../types/domain';
import {
  mapAgentDtoToModel,
  mapAgentListDtoToItems,
  type AgentDto,
} from '../adapters/agents.adapter';
import type { AgentService } from '../core/contracts';

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toPaginatedResult<T>(
  allItems: T[],
  page: number,
  pageSize: number,
  totalItemsHint?: number | null,
): PaginatedResult<T> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const start = (safePage - 1) * safePageSize;
  const hasServerPaginationHint =
    typeof totalItemsHint === 'number' && totalItemsHint >= 0;

  const items = hasServerPaginationHint
    ? allItems
    : allItems.slice(start, start + safePageSize);
  const totalItems = hasServerPaginationHint ? totalItemsHint : allItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));

  return {
    items,
    meta: {
      page: Math.min(safePage, totalPages),
      pageSize: safePageSize,
      totalItems,
      totalPages,
    },
  };
}

function extractDto<T extends Record<string, unknown>>(
  value: unknown,
  nestedKey: string,
): T | null {
  const payload = toRecord(value);
  if (!payload) {
    return null;
  }

  const nested = toRecord(payload[nestedKey]);
  if (nested) {
    return nested as T;
  }

  const nestedResult = toRecord(payload.result);
  if (nestedResult) {
    return nestedResult as T;
  }

  const nestedData = toRecord(payload.data);
  if (nestedData) {
    return nestedData as T;
  }

  return payload as T;
}

function toMetadataPayload(
  metadata: AgentMutationInput['metadata'],
): Record<string, unknown> {
  if (!metadata) {
    return {};
  }

  return Object.fromEntries(Object.entries(metadata));
}

function toAgentPayload(
  input: AgentMutationInput | AgentPatchInput,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (input.fullName !== undefined) {
    payload.full_name = input.fullName;
  }

  if (input.phone !== undefined) {
    payload.phone = input.phone;
  }

  if (input.telegramChatId !== undefined) {
    payload.telegram_chat_id = input.telegramChatId;
  }

  if (input.telegramUsername !== undefined) {
    payload.telegram_username = input.telegramUsername;
  }

  if (input.isActive !== undefined) {
    payload.is_active = input.isActive;
  }

  if (input.productIds !== undefined) {
    payload.product_ids = input.productIds;
  }

  if (input.metadata !== undefined) {
    payload.metadata = toMetadataPayload(input.metadata);
  }

  return payload;
}

function mapSingleAgent(value: unknown, fallbackId?: EntityId): Agent | null {
  const dto = extractDto<AgentDto>(value, 'agent');
  if (!dto) {
    return null;
  }

  const dtoId = typeof dto.id === 'string' && dto.id.trim() ? dto.id : null;
  return mapAgentDtoToModel(dtoId || !fallbackId ? dto : { ...dto, id: fallbackId });
}

function toListParams(params?: AgentListParams): URLSearchParams {
  const query = new URLSearchParams();
  query.set('page', String(Math.max(1, params?.page ?? 1)));
  query.set('page_size', String(Math.max(1, params?.pageSize ?? 10)));

  if (params?.search) {
    query.set('search', params.search);
  }

  if (params?.is_active !== undefined) {
    query.set('is_active', params.is_active ? 'true' : 'false');
  }

  if (params?.ordering) {
    query.set('ordering', params.ordering);
  }

  if (params?.products?.length) {
    for (const productId of params.products) {
      query.append('products', productId);
    }
  }

  return query;
}

export async function listAgents(
  params?: AgentListParams,
): Promise<PaginatedResult<Agent>> {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.max(1, params?.pageSize ?? 10);

  const { data } = await apiClient.get<unknown>('/api/agents/', {
    params: toListParams(params),
  });

  const items = mapAgentListDtoToItems(data);
  const payload = toRecord(data);
  const totalItemsHint = readNumber(payload?.count);

  return toPaginatedResult(items, page, pageSize, totalItemsHint);
}

export async function getAgentById(id: EntityId): Promise<Agent | null> {
  const { data } = await apiClient.get<unknown>(`/api/agents/${id}/`);
  return mapSingleAgent(data, id);
}

export async function createAgent(input: AgentMutationInput): Promise<Agent> {
  const { data } = await apiClient.post<unknown>('/api/agents/', toAgentPayload(input));

  const mapped = mapSingleAgent(data);
  if (!mapped) {
    throw new Error('Failed to create agent: invalid API response.');
  }

  return mapped;
}

export async function updateAgent(
  id: EntityId,
  input: AgentMutationInput,
): Promise<Agent | null> {
  const { data } = await apiClient.put<unknown>(
    `/api/agents/${id}/`,
    toAgentPayload(input),
  );

  return mapSingleAgent(data, id);
}

export async function patchAgent(
  id: EntityId,
  input: AgentPatchInput,
): Promise<Agent | null> {
  const { data } = await apiClient.patch<unknown>(
    `/api/agents/${id}/`,
    toAgentPayload(input),
  );

  return mapSingleAgent(data, id);
}

export async function deleteAgent(id: EntityId): Promise<boolean> {
  await apiClient.delete(`/api/agents/${id}/`);
  return true;
}

export const apiAgentService: AgentService = {
  async list(params) {
    return listAgents(params);
  },

  async getById(id) {
    return getAgentById(id);
  },

  async create(input) {
    return createAgent(input);
  },

  async update(id, input) {
    return updateAgent(id, input);
  },

  async patch(id, input) {
    return patchAgent(id, input);
  },

  async delete(id) {
    return deleteAgent(id);
  },

  async listAgents(params) {
    return listAgents(params);
  },

  async getAgentById(id) {
    return getAgentById(id);
  },

  async createAgent(input) {
    return createAgent(input);
  },

  async updateAgent(id, input) {
    return updateAgent(id, input);
  },

  async patchAgent(id, input) {
    return patchAgent(id, input);
  },

  async deleteAgent(id) {
    return deleteAgent(id);
  },
};
