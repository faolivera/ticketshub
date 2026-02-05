import { createContext, useContext, useState, ReactNode } from 'react';

export type UserLevel = 0 | 1 | 2;

export interface User {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  country: string;
  level: UserLevel;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  hasSeenSellerIntro: boolean;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  legalFirstName?: string;
  legalLastName?: string;
  dateOfBirth?: string;
  governmentIdNumber?: string;
  bankAccountNumber?: string;
  accountHolderName?: string;
}

interface UserContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  upgradeToLevel1: () => void;
  upgradeToLevel2: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>({
    id: 'user-1',
    email: 'john.doe@email.com',
    phone: '+1234567890',
    firstName: 'John',
    lastName: 'Doe',
    country: 'United States',
    level: 0,
    isEmailVerified: true,
    isPhoneVerified: true,
    hasSeenSellerIntro: false
  });

  const isAuthenticated = user !== null;

  const login = (newUser: User) => {
    setUser(newUser);
  };

  const logout = () => {
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  const upgradeToLevel1 = () => {
    if (user && user.level === 0) {
      setUser({ ...user, level: 1, hasSeenSellerIntro: true });
    }
  };

  const upgradeToLevel2 = () => {
    if (user && user.level === 1) {
      setUser({ ...user, level: 2, verificationStatus: 'verified' });
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        logout,
        updateUser,
        upgradeToLevel1,
        upgradeToLevel2
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
