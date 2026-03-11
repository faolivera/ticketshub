import type { User } from '../../modules/users/users.domain';
import { IdentityVerificationStatus } from '../../modules/users/users.domain';

/**
 * Seller tier: only defined when user is a seller (accepted terms) and can sell (V1+V2).
 * VERIFIED_SELLER = can sell and has V3+V4 (full payout capability).
 */
export enum SellerTier {
  UNVERIFIED_SELLER = 'UNVERIFIED_SELLER',
  VERIFIED_SELLER = 'VERIFIED_SELLER',
}

/**
 * Centralized helper for verification state (V1-V4) and derived seller capability.
 * All gates should use these functions instead of checking raw fields or a "level" enum.
 */
export class VerificationHelper {
  static hasV1(user: User): boolean {
    return user.emailVerified === true;
  }

  static hasV2(user: User): boolean {
    return user.phoneVerified === true;
  }

  static hasV3(user: User): boolean {
    return (
      user.identityVerification?.status === IdentityVerificationStatus.Approved
    );
  }

  static hasV4(user: User): boolean {
    return user.bankAccount?.verified === true;
  }

  static isSeller(user: User): boolean {
    return user.acceptedSellerTermsAt != null;
  }

  static canSell(user: User): boolean {
    return this.isSeller(user) && this.hasV1(user) && this.hasV2(user);
  }

  /**
   * Seller tier: undefined when not a seller or when seller but cannot sell yet.
   * UNVERIFIED_SELLER when canSell but missing V3 and/or V4.
   * VERIFIED_SELLER when canSell and has V3 + V4 (full payout capability).
   */
  static sellerTier(user: User): SellerTier | undefined {
    if (!this.isSeller(user)) return undefined;
    if (!this.canSell(user)) return undefined;
    if (this.hasV3(user) && this.hasV4(user)) return SellerTier.VERIFIED_SELLER;
    return SellerTier.UNVERIFIED_SELLER;
  }

  static canReceivePayout(user: User): boolean {
    return this.hasV3(user) && this.hasV4(user);
  }
}
