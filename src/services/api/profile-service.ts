import type { ProfileService } from '../core/contracts';
import { authService } from './auth.service';

export const apiProfileService: ProfileService = {
  async getCurrentUser() {
    return authService.getMe();
  },
};
