import { DEMO_AUTH_ACCOUNTS } from './demo-users';
import { clearAuthSession, readAuthSession, writeAuthSession } from './storage';
import type { AuthSession, LoginInput } from './types';

const MOCK_AUTH_DELAY_MS = 220;
const SESSION_DURATION_HOURS = 12;

function delay<T>(value: T, ms = MOCK_AUTH_DELAY_MS): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), ms);
  });
}

function createToken(prefix: 'access' | 'refresh', seed: string): string {
  const value = `${prefix}:${seed}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${btoa(value)}`;
}

function createSession(userEmail: string): AuthSession {
  const account = DEMO_AUTH_ACCOUNTS.find(
    (item) => item.email.toLowerCase() === userEmail.toLowerCase(),
  );

  if (!account) {
    throw new Error('Invalid email or password.');
  }

  const issuedAtDate = new Date();
  const expiresAtDate = new Date(
    issuedAtDate.getTime() + SESSION_DURATION_HOURS * 60 * 60 * 1000,
  );

  return {
    accessToken: createToken('access', account.user.id),
    refreshToken: createToken('refresh', account.user.id),
    issuedAt: issuedAtDate.toISOString(),
    expiresAt: expiresAtDate.toISOString(),
    user: account.user,
  };
}

export const mockAuthService = {
  async login(input: LoginInput): Promise<AuthSession> {
    const email = input.email.trim().toLowerCase();
    const password = input.password;

    const account = DEMO_AUTH_ACCOUNTS.find(
      (item) => item.email.toLowerCase() === email,
    );

    if (!account || account.password !== password) {
      await delay(null);
      throw new Error('Invalid email or password.');
    }

    const session = createSession(account.email);
    writeAuthSession(session);
    return delay(session);
  },

  logout(): void {
    clearAuthSession();
  },

  getSession(): AuthSession | null {
    const session = readAuthSession();
    if (!session) {
      return null;
    }

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      clearAuthSession();
      return null;
    }

    return session;
  },

  getCurrentUser() {
    return this.getSession()?.user ?? null;
  },

  isAuthenticated(): boolean {
    return this.getSession() !== null;
  },
};
