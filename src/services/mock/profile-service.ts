import type { ProfileService } from '../core/contracts';
import { mockDataStore } from './dataset';
import { withMockDelay } from './helpers';

export const mockProfileService: ProfileService = {
  async getCurrentUser() {
    return withMockDelay(mockDataStore.currentUser, 140);
  },
};
