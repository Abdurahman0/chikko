import { clearStoredAuthUser, getStoredAuthUser } from '../features/auth/auth-store';
import { clearTokens, getAccessToken, getRefreshToken } from '../lib/auth-storage';
import type { AuthSession, LoginInput } from './types';

function getSessionSnapshot(): AuthSession | null {
  const user = getStoredAuthUser();
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  if (!user || !accessToken || !refreshToken) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    accessToken,
    refreshToken,
    issuedAt: now,
    expiresAt: now,
    user,
  };
}

export const mockAuthService = {
  async login(_input: LoginInput): Promise<AuthSession> {
    throw new Error('Mock auth is disabled. Use API auth login flow.');
  },

  logout(): void {
    clearTokens();
    clearStoredAuthUser();
  },

  getSession(): AuthSession | null {
    return getSessionSnapshot();
  },

  getCurrentUser() {
    return getSessionSnapshot()?.user ?? null;
  },

  isAuthenticated(): boolean {
    return getSessionSnapshot() !== null;
  },
};
