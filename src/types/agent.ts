import type { AuditInfo, EntityId } from './common';

export interface AgentProduct {
  id: EntityId;
  name: string;
  sku?: string;
  isActive: boolean;
}

export interface Agent extends AuditInfo {
  id: EntityId;
  fullName: string;
  phone?: string;
  telegramChatId?: string;
  telegramUsername?: string;
  isActive: boolean;
  products: AgentProduct[];
  metadata?: Record<string, string | number | boolean | null>;
}

export interface AgentMutationInput {
  fullName: string;
  phone: string;
  telegramChatId: string;
  telegramUsername: string;
  isActive: boolean;
  productIds: EntityId[];
  metadata?: Record<string, string | number | boolean | null>;
}

export type AgentPatchInput = Partial<AgentMutationInput>;

export interface AgentListParams {
  page: number;
  pageSize: number;
  search?: string;
  is_active?: boolean;
  ordering?: string;
  products?: EntityId[];
}
