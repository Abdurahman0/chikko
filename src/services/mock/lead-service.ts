import type { LeadService } from '../core/contracts';
import { mockDataStore } from './dataset';
import { filterItemsBySearch, findById, paginateItems, withMockDelay } from './helpers';

export const mockLeadService: LeadService = {
  async list(params) {
    const items = filterItemsBySearch(
      mockDataStore.leads,
      params?.search,
      (lead) =>
        `${lead.fullName} ${lead.contact.phone ?? ''} ${lead.username ?? ''} ${lead.status}`,
    );

    return withMockDelay(paginateItems(items, params), 180);
  },
  async getById(id) {
    return withMockDelay(findById(mockDataStore.leads, id), 140);
  },
};
