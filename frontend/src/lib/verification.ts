import type { User } from '@/api/types/users';

/**
 * Seller tier: only defined when user is a seller (accepted terms) and can sell (V1+V2).
 * VERIFIED_SELLER = can sell and has V3+V4 (full payout capability).
 */
export enum SellerTier {
  UNVERIFIED_SELLER = 'UNVERIFIED_SELLER',
  VERIFIED_SELLER = 'VERIFIED_SELLER',
}

/**
 * Frontend verification helper: V1–V4 and derived seller state.
 * Mirrors backend VerificationHelper logic for UI and guards.
 * GET /users/me exposes only identityVerified and bankDetailsVerified (booleans).
 */
export const VerificationHelper = {
  hasV1(user: User | null | undefined): boolean {
    return user?.emailVerified === true;
  },

  hasV2(user: User | null | undefined): boolean {
    return user?.phoneVerified === true;
  },

  hasV3(user: User | null | undefined): boolean {
    return user?.identityVerified === true;
  },

  hasV4(user: User | null | undefined): boolean {
    return user?.bankDetailsVerified === true;
  },

  isSeller(user: User | null | undefined): boolean {
    return user?.acceptedSellerTermsAt != null;
  },

  canSell(user: User | null | undefined): boolean {
    return this.isSeller(user) && this.hasV1(user) && this.hasV2(user);
  },

  /**
   * Seller tier: undefined when not a seller or when seller but cannot sell yet.
   * UNVERIFIED_SELLER when canSell but missing V3 and/or V4.
   * VERIFIED_SELLER when canSell and has V3 + V4 (full payout capability).
   */
  sellerTier(user: User | null | undefined): SellerTier | undefined {
    if (!this.isSeller(user)) return undefined;
    if (!this.canSell(user)) return undefined;
    if (this.hasV3(user) && this.hasV4(user)) return SellerTier.VERIFIED_SELLER;
    return SellerTier.UNVERIFIED_SELLER;
  },

  canReceivePayout(user: User | null | undefined): boolean {
    return this.hasV3(user) && this.hasV4(user);
  },
};
