import { authService } from '../../services/api/auth.service';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '../../lib/auth-storage';
import type { AuthenticatedUser } from '../../auth/types';
import { requestTokenRefresh, setAuthFailureHandler } from '../../lib/api-client';
import { routePaths } from '../../config/routes';

interface AuthState {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  loading: boolean;
}

interface LogoutOptions {
  redirectToLogin?: boolean;
}

type AuthStateListener = (state: AuthState) => void;

const AUTH_USER_STORAGE_KEY = 'chikko-auth-user-v1';

const authState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: true,
};

const listeners = new Set<AuthStateListener>();
let restoreSessionPromise: Promise<void> | null = null;
let hasAttemptedInitialRestore = false;

function emitChange() {
  const snapshot = { ...authState };
  for (const listener of listeners) {
    listener(snapshot);
  }
}

function persistUser(user: AuthenticatedUser | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (user) {
      window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
      return;
    }

    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  } catch {
    // Ignore storage failures and keep in-memory state as source of truth.
  }
}

function readPersistedUser(): AuthenticatedUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const user = parsed as Partial<AuthenticatedUser>;
    if (
      typeof user.id !== 'string' ||
      typeof user.email !== 'string' ||
      typeof user.fullName !== 'string' ||
      typeof user.role !== 'string' ||
      !Array.isArray(user.permissionKeys)
    ) {
      return null;
    }

    return user as AuthenticatedUser;
  } catch {
    return null;
  }
}

function setState(nextState: Partial<AuthState>) {
  if (typeof nextState.user !== 'undefined') {
    authState.user = nextState.user;
    authState.isAuthenticated = Boolean(nextState.user);
    persistUser(nextState.user);
  }

  if (typeof nextState.isAuthenticated === 'boolean') {
    authState.isAuthenticated = nextState.isAuthenticated;
  }

  if (typeof nextState.loading === 'boolean') {
    authState.loading = nextState.loading;
  }

  emitChange();
}

function redirectToLoginIfNeeded(): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (window.location.pathname === routePaths.login) {
    return;
  }

  window.location.replace(routePaths.login);
}

export function getAuthState(): AuthState {
  return { ...authState };
}

export function subscribeAuthState(listener: AuthStateListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getStoredAuthUser(): AuthenticatedUser | null {
  return authState.user ?? readPersistedUser();
}

export function clearStoredAuthUser(): void {
  persistUser(null);
}

export async function login(email: string, password: string): Promise<AuthenticatedUser> {
  setState({ loading: true });

  try {
    const result = await authService.login(email, password);
    setTokens({ access: result.access, refresh: result.refresh });

    let effectiveUser = result.user;
    try {
      // Ensure sidebar/route permissions always use fully resolved backend user data.
      effectiveUser = await authService.getMe();
    } catch {
      // Fall back to login payload if /me is temporarily unavailable.
    }

    setState({
      user: effectiveUser,
      isAuthenticated: true,
      loading: false,
    });

    return effectiveUser;
  } catch (error) {
    clearTokens();
    setState({
      user: null,
      isAuthenticated: false,
      loading: false,
    });
    throw error;
  }
}

export function logout(options?: LogoutOptions): void {
  clearTokens();
  setState({
    user: null,
    isAuthenticated: false,
    loading: false,
  });

  if (options?.redirectToLogin) {
    redirectToLoginIfNeeded();
  }
}

export async function fetchMe(): Promise<AuthenticatedUser> {
  const user = await authService.getMe();
  setState({
    user,
    isAuthenticated: true,
  });
  return user;
}

export async function restoreSession(): Promise<void> {
  if (hasAttemptedInitialRestore) {
    return;
  }

  if (restoreSessionPromise) {
    return restoreSessionPromise;
  }

  restoreSessionPromise = (async () => {
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();
    const fallbackUser = readPersistedUser();

    if (fallbackUser) {
      setState({
        user: fallbackUser,
        isAuthenticated: true,
        loading: true,
      });
    } else {
      setState({ loading: true });
    }

    if (!accessToken && !refreshToken) {
      logout();
      return;
    }

    if (!accessToken && refreshToken) {
      try {
        const refreshed = await requestTokenRefresh();
        if (!refreshed) {
          logout();
          return;
        }
      } catch {
        logout({ redirectToLogin: true });
        return;
      }
    }

    if (!getAccessToken()) {
      logout();
      return;
    }

    try {
      await fetchMe();
    } catch {
      logout({ redirectToLogin: true });
    } finally {
      setState({ loading: false });
    }
  })().finally(() => {
    hasAttemptedInitialRestore = true;
    restoreSessionPromise = null;
  });

  return restoreSessionPromise;
}

setAuthFailureHandler(() => {
  logout({ redirectToLogin: true });
});
