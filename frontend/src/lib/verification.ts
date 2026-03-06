import { IdentityVerificationStatus } from '@/api/types/users';
import type { User } from '@/api/types/users';

/**
 * Frontend verification helper: V1–V4 and derived seller state.
 * Mirrors backend VerificationHelper logic for UI and guards.
 */
export const VerificationHelper = {
  hasV1(user: User | null | undefined): boolean {
    return user?.emailVerified === true;
  },

  hasV2(user: User | null | undefined): boolean {
    return user?.phoneVerified === true;
  },

  hasV3(user: User | null | undefined): boolean {
    return user?.identityVerification?.status === IdentityVerificationStatus.Approved;
  },

  hasV4(user: User | null | undefined): boolean {
    return user?.bankAccount?.verified === true;
  },

  isSeller(user: User | null | undefined): boolean {
    return user?.acceptedSellerTermsAt != null;
  },

  canSell(user: User | null | undefined): boolean {
    return this.isSeller(user) && this.hasV1(user) && this.hasV2(user);
  },

  /** Seller tier: 0 = no V3/V4, 1 = V3 only, 2 = V3+V4 (full payout capability). */
  sellerTier(user: User | null | undefined): 0 | 1 | 2 {
    if (!this.isSeller(user)) return 0;
    if (this.hasV3(user) && this.hasV4(user)) return 2;
    if (this.hasV3(user)) return 1;
    return 0;
  },

  canReceivePayout(user: User | null | undefined): boolean {
    return this.hasV3(user) && this.hasV4(user);
  },
};
