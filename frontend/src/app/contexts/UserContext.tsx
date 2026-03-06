import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { authService } from '../../api/services/auth.service';
import { usersService } from '../../api/services/users.service';
import { getToken, removeToken } from '../../api/client';
import { SELLER_UNVERIFIED_MODAL_DISMISSED_KEY } from '../components/SellerUnverifiedModal';
import { VerificationHelper } from '../../lib/verification';
import type {
  AuthenticatedUserPublicInfo,
  LoginRequest,
  LoginResponse,
} from '../../api/types';

/**
 * Extended user type for frontend with additional local state
 */
export interface User extends AuthenticatedUserPublicInfo {
  // Additional frontend-only fields
  hasSeenSellerIntro?: boolean;
}

interface UserContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<LoginResponse>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  upgradeToLevel1: () => Promise<void>;
  canSell: () => boolean;
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
   * Login with email and password.
   * Returns the response so caller can check requiresEmailVerification.
   */
  const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(credentials);
      if (response.requiresEmailVerification) {
        // Keep token for OTP endpoints, but do not mark session as authenticated yet.
        setUser(null);
      } else {
        setUser({
          ...response.user,
          hasSeenSellerIntro:
            localStorage.getItem('hasSeenSellerIntro') === 'true',
        });
      }
      return response;
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
    try {
      sessionStorage.removeItem(SELLER_UNVERIFIED_MODAL_DISMISSED_KEY);
    } catch {
      // ignore if sessionStorage is unavailable
    }
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

  /**
   * Upgrade user to seller (level 1)
   */
  const upgradeToLevel1 = async () => {
    try {
      await usersService.upgradeToSeller();
      await refreshUser();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upgrade';
      setError(message);
      throw err;
    }
  };

  /**
   * Check if user can sell (accepted seller terms + V1 + V2)
   */
  const canSell = useCallback((): boolean => {
    return VerificationHelper.canSell(user);
  }, [user]);

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
        upgradeToLevel1,
        canSell,
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
 * Hook to get seller tier (0, 1, 2) from V-flags for badges and UI
 */
export function useSellerTier(): 0 | 1 | 2 {
  const { user } = useUser();
  return VerificationHelper.sellerTier(user);
}
