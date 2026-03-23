import type { ProfileService } from '../core/contracts';
import { createNotImplementedError } from './not-implemented';

export const apiProfileService: ProfileService = {
  async getCurrentUser() {
    throw createNotImplementedError('ProfileService', 'getCurrentUser');
  },
};
