import type { ProfileService } from '../core/contracts';
import { mockAuthService } from '../../auth/mock-auth-service';
import { withMockDelay } from './helpers';

export const mockProfileService: ProfileService = {
  async getCurrentUser() {
    return withMockDelay(mockAuthService.getCurrentUser(), 140);
  },
};
