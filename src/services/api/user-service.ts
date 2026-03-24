import type { UserService } from '../core/contracts';
import { createNotImplementedError } from './not-implemented';

export const apiUserService: UserService = {
  async listUsers() {
    throw createNotImplementedError('UserService', 'listUsers');
  },
  async getUserById() {
    throw createNotImplementedError('UserService', 'getUserById');
  },
  async createUser() {
    throw createNotImplementedError('UserService', 'createUser');
  },
  async updateUser() {
    throw createNotImplementedError('UserService', 'updateUser');
  },
  async patchUser() {
    throw createNotImplementedError('UserService', 'patchUser');
  },
  async deleteUser() {
    throw createNotImplementedError('UserService', 'deleteUser');
  },
  async toggleUserActive() {
    throw createNotImplementedError('UserService', 'toggleUserActive');
  },
  async listPermissions() {
    throw createNotImplementedError('UserService', 'listPermissions');
  },
  async getPermissionById() {
    throw createNotImplementedError('UserService', 'getPermissionById');
  },
};
