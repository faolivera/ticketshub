import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { authService } from '../../api/services/auth.service';
import { getToken, removeToken } from '../../api/client';
import type { 
  AuthenticatedUserPublicInfo, 
  LoginRequest,
  UserLevel,
} from '../../api/types';

/**
 * Extended user type for frontend with additional local state
 */
export interface User extends AuthenticatedUserPublicInfo {
  // Additional frontend-only fields
  hasSeenSellerIntro?: boolean;
}

/**
 * Map backend UserLevel to numeric level for UI compatibility
 */
export function userLevelToNumber(level: UserLevel): 0 | 1 | 2 {
  switch (level) {
    case 'Basic':
    case 'Buyer':
      return 0;
    case 'Seller':
      return 1;
    case 'VerifiedSeller':
      return 2;
    default:
      return 0;
  }
}

interface UserContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = user !== null;

  /**
   * Fetch current user from API
   */
  const refreshUser = useCallback(async () => {
    try {
      const userData = await authService.getMe();
      setUser({
        ...userData,
        hasSeenSellerIntro: localStorage.getItem('hasSeenSellerIntro') === 'true',
      });
      setError(null);
    } catch (err) {
      // If fetching user fails, clear auth state
      setUser(null);
      removeToken();
    }
  }, []);

  /**
   * Initialize auth state on mount
   */
  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      if (token) {
        await refreshUser();
      }
      setIsLoading(false);
    };

    initAuth();
  }, [refreshUser]);

  /**
   * Listen for unauthorized events (401 responses)
   */
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setError('Session expired. Please login again.');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  /**
   * Login with email and password
   */
  const login = async (credentials: LoginRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(credentials);
      setUser({
        ...response.user,
        hasSeenSellerIntro: localStorage.getItem('hasSeenSellerIntro') === 'true',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout - clear token and user state
   */
  const logout = () => {
    authService.logout();
    setUser(null);
    setError(null);
  };

  /**
   * Update user with partial data (local state only)
   */
  const updateUser = (updates: Partial<User>) => {
    if (user) {
      // Persist hasSeenSellerIntro to localStorage
      if (updates.hasSeenSellerIntro !== undefined) {
        localStorage.setItem('hasSeenSellerIntro', String(updates.hasSeenSellerIntro));
      }
      setUser({ ...user, ...updates });
    }
  };

  /**
   * Clear error message
   */
  const clearError = () => {
    setError(null);
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        logout,
        updateUser,
        refreshUser,
        clearError,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

/**
 * Hook to get numeric user level for UI components
 */
export function useUserLevel(): 0 | 1 | 2 {
  const { user } = useUser();
  if (!user) return 0;
  return userLevelToNumber(user.level);
}
