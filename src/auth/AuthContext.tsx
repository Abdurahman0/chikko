import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { AppRouteId } from '../config/routes';
import type { AppRole } from '../types/architecture';
import {
  canAccessRouteForUser,
  hasPermission as hasPermissionForUser,
  hasRole as hasRoleForUser,
  resolveDefaultLandingPathForUser,
} from './access-control';
import { mockAuthService } from './mock-auth-service';
import type { AuthSession, AuthenticatedUser, LoginInput, PermissionCode } from './types';

interface AuthContextValue {
  currentUser: AuthenticatedUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (input: LoginInput) => Promise<AuthenticatedUser>;
  logout: () => void;
  hasPermission: (permission: PermissionCode) => boolean;
  hasRole: (role: AppRole | readonly AppRole[]) => boolean;
  canAccessRoute: (routeId: AppRouteId) => boolean;
  resolveDefaultLandingPath: () => string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    setSession(mockAuthService.getSession());
    setIsBootstrapping(false);
  }, []);

  const currentUser = session?.user ?? null;
  const isAuthenticated = currentUser !== null;

  const login = useCallback(async (input: LoginInput) => {
    const nextSession = await mockAuthService.login(input);
    setSession(nextSession);
    return nextSession.user;
  }, []);

  const logout = useCallback(() => {
    mockAuthService.logout();
    setSession(null);
  }, []);

  const hasPermission = useCallback(
    (permission: PermissionCode) => hasPermissionForUser(currentUser, permission),
    [currentUser],
  );

  const hasRole = useCallback(
    (role: AppRole | readonly AppRole[]) => hasRoleForUser(currentUser, role),
    [currentUser],
  );

  const canAccessRoute = useCallback(
    (routeId: AppRouteId) => canAccessRouteForUser(currentUser, routeId),
    [currentUser],
  );

  const resolveDefaultLandingPath = useCallback(
    () => resolveDefaultLandingPathForUser(currentUser),
    [currentUser],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      session,
      isAuthenticated,
      isBootstrapping,
      login,
      logout,
      hasPermission,
      hasRole,
      canAccessRoute,
      resolveDefaultLandingPath,
    }),
    [
      currentUser,
      session,
      isAuthenticated,
      isBootstrapping,
      login,
      logout,
      hasPermission,
      hasRole,
      canAccessRoute,
      resolveDefaultLandingPath,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
}
