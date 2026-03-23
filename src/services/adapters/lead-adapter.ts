import type { Lead } from '../../types/domain';

export type LeadDto = Record<string, unknown>;

export function mapLeadDtoToModel(_dto: LeadDto): Lead {
  throw new Error('Not implemented: mapLeadDtoToModel');
}
