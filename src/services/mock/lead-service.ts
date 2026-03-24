import type { LeadService } from '../core/contracts';
import { toUserSummary } from '../../mock';
import type {
  Lead,
  LeadMutationInput,
  LeadPatchInput,
  LeadSource,
  LeadStatus,
} from '../../types/domain';
import { mockDataStore } from './dataset';
import { filterItemsBySearch, findById, paginateItems, withMockDelay } from './helpers';

type LeadOrderingField = 'created_at' | 'updated_at' | 'full_name';

const ALLOWED_STATUSES: readonly LeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'negotiating',
  'converted',
  'lost',
];

const ALLOWED_SOURCES: readonly LeadSource[] = [
  'telegram',
  'instagram',
  'manual',
  'website',
  'web',
];

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
}

function normalizeUsername(value: string | null | undefined): string | null {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  return normalized.replace(/^@+/, '');
}

function normalizeStatus(value: LeadStatus): LeadStatus {
  if (!ALLOWED_STATUSES.includes(value)) {
    throw new Error('Invalid lead status.');
  }

  return value;
}

function normalizeSource(value: LeadSource): LeadSource {
  if (!ALLOWED_SOURCES.includes(value)) {
    throw new Error('Invalid lead source.');
  }

  return value;
}

function resolveAssignedOperator(operatorId: string | null | undefined) {
  if (!operatorId) {
    return undefined;
  }

  const operator =
    mockDataStore.operators.find((entry) => entry.id === operatorId) ?? null;

  return operator ? toUserSummary(operator) : undefined;
}

function resolveOrdering(params?: Parameters<LeadService['list']>[0]): {
  field: LeadOrderingField;
  direction: 'asc' | 'desc';
} {
  const requestedOrdering = params?.ordering?.trim();
  if (requestedOrdering) {
    const direction = requestedOrdering.startsWith('-') ? 'desc' : 'asc';
    const field = requestedOrdering.replace('-', '');

    if (field === 'created_at' || field === 'updated_at' || field === 'full_name') {
      return { field, direction };
    }
  }

  const sortBy = params?.sortBy;
  const sortDirection = params?.sortDirection === 'asc' ? 'asc' : 'desc';

  if (sortBy === 'created_at' || sortBy === 'createdAt') {
    return { field: 'created_at', direction: sortDirection };
  }

  if (sortBy === 'updated_at' || sortBy === 'updatedAt') {
    return { field: 'updated_at', direction: sortDirection };
  }

  if (sortBy === 'full_name' || sortBy === 'fullName') {
    return { field: 'full_name', direction: sortDirection };
  }

  return { field: 'updated_at', direction: 'desc' };
}

function compareLeads(left: Lead, right: Lead, field: LeadOrderingField): number {
  if (field === 'full_name') {
    return left.fullName.localeCompare(right.fullName);
  }

  const leftValue = field === 'created_at' ? left.createdAt : left.updatedAt;
  const rightValue = field === 'created_at' ? right.createdAt : right.updatedAt;

  return new Date(leftValue).getTime() - new Date(rightValue).getTime();
}

function normalizeMutationInput(input: LeadMutationInput) {
  const fullName = input.full_name.trim();
  if (!fullName) {
    throw new Error('Lead full name is required.');
  }

  const status = normalizeStatus(input.status);
  const source = normalizeSource(input.source);

  const phone = normalizeText(input.phone);
  const email = normalizeText(input.email);
  const instagramUsername = normalizeUsername(input.instagram_username);
  const telegramUsername = normalizeUsername(input.telegram_username);
  const notes = normalizeText(input.notes);
  const assignedOperator = resolveAssignedOperator(input.assigned_operator);
  const username = instagramUsername ?? telegramUsername ?? undefined;

  return {
    fullName,
    phone,
    email,
    source,
    status,
    instagramUsername,
    telegramUsername,
    notes,
    metadata: input.metadata ?? null,
    assignedOperator,
    username,
  };
}

function resolvePatchInput(existing: Lead, input: LeadPatchInput): LeadMutationInput {
  return {
    full_name: input.full_name ?? existing.fullName,
    phone: input.phone ?? existing.contact.phone ?? null,
    email: input.email ?? existing.contact.email ?? null,
    instagram_username:
      input.instagram_username ?? existing.instagramUsername ?? null,
    telegram_username: input.telegram_username ?? existing.telegramUsername ?? null,
    source: input.source ?? existing.source,
    status: input.status ?? existing.status,
    notes: input.notes ?? existing.notes ?? existing.notesSummary ?? null,
    metadata: input.metadata ?? existing.metadata ?? null,
    assigned_operator: input.assigned_operator ?? existing.assignedOperator?.id ?? null,
  };
}

export const mockLeadService: LeadService = {
  async list(params) {
    const statusFilter = params?.status as LeadStatus | undefined;
    const sourceFilter = params?.source as LeadSource | undefined;
    const assignedOperatorFilter =
      params?.assignedOperator ?? params?.assigned_operator;
    const { field, direction } = resolveOrdering(params);

    const searchedItems = filterItemsBySearch(
      mockDataStore.leads,
      params?.search,
      (lead) =>
        [
          lead.fullName,
          lead.contact.phone ?? '',
          lead.contact.email ?? '',
          lead.instagramUsername ?? '',
          lead.telegramUsername ?? '',
          lead.username ?? '',
          lead.status,
          lead.source,
          lead.assignedOperator?.fullName ?? '',
        ]
          .join(' ')
          .toLowerCase(),
    );

    const filteredItems = searchedItems.filter((lead) => {
      const matchesStatus = !statusFilter || lead.status === statusFilter;
      const matchesSource = !sourceFilter || lead.source === sourceFilter;
      const matchesOperator =
        !assignedOperatorFilter || lead.assignedOperator?.id === assignedOperatorFilter;

      return matchesStatus && matchesSource && matchesOperator;
    });

    const sortedItems = [...filteredItems].sort((left, right) => {
      const compared = compareLeads(left, right, field);
      if (compared === 0) {
        return right.id.localeCompare(left.id);
      }

      return direction === 'asc' ? compared : -compared;
    });

    return withMockDelay(paginateItems(sortedItems, params), 180);
  },

  async getById(id) {
    return withMockDelay(findById(mockDataStore.leads, id), 140);
  },

  async create(input) {
    const payload = normalizeMutationInput(input);
    const now = new Date().toISOString();

    const nextLead: Lead = {
      id: `lead-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      fullName: payload.fullName,
      username: payload.username,
      contact: {
        phone: payload.phone ?? undefined,
        email: payload.email ?? undefined,
        username: payload.username,
      },
      source: payload.source,
      status: payload.status,
      assignedOperator: payload.assignedOperator,
      instagramUsername: payload.instagramUsername ?? undefined,
      telegramUsername: payload.telegramUsername ?? undefined,
      notes: payload.notes ?? undefined,
      metadata: payload.metadata,
      notesSummary: payload.notes ?? undefined,
      replied: payload.status !== 'new' && payload.status !== 'lost',
      dmSent: payload.status !== 'new',
      createdAt: now,
      updatedAt: now,
    };

    mockDataStore.leads.unshift(nextLead);
    return withMockDelay(nextLead, 170);
  },

  async update(id, input) {
    const index = mockDataStore.leads.findIndex((lead) => lead.id === id);
    if (index < 0) {
      return withMockDelay(null, 140);
    }

    const payload = normalizeMutationInput(input);
    const existing = mockDataStore.leads[index]!;
    const now = new Date().toISOString();

    const nextLead: Lead = {
      ...existing,
      fullName: payload.fullName,
      username: payload.username,
      contact: {
        ...existing.contact,
        phone: payload.phone ?? undefined,
        email: payload.email ?? undefined,
        username: payload.username,
      },
      source: payload.source,
      status: payload.status,
      assignedOperator: payload.assignedOperator,
      instagramUsername: payload.instagramUsername ?? undefined,
      telegramUsername: payload.telegramUsername ?? undefined,
      notes: payload.notes ?? undefined,
      metadata: payload.metadata,
      notesSummary: payload.notes ?? undefined,
      replied: payload.status !== 'new' && payload.status !== 'lost',
      dmSent: payload.status !== 'new',
      updatedAt: now,
    };

    mockDataStore.leads.splice(index, 1, nextLead);
    return withMockDelay(nextLead, 170);
  },

  async patch(id, input) {
    const existing = mockDataStore.leads.find((lead) => lead.id === id);
    if (!existing) {
      return withMockDelay(null, 140);
    }

    const fullPayload = resolvePatchInput(existing, input);
    return this.update(id, fullPayload);
  },

  async delete(id) {
    const index = mockDataStore.leads.findIndex((lead) => lead.id === id);
    if (index < 0) {
      return withMockDelay(false, 120);
    }

    mockDataStore.leads.splice(index, 1);
    return withMockDelay(true, 130);
  },
};
