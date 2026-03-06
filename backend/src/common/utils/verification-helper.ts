import type { User } from '../../modules/users/users.domain';
import { IdentityVerificationStatus } from '../../modules/users/users.domain';

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
    return user.identityVerification?.status === IdentityVerificationStatus.Approved;
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
   * Seller tier: 0 = no V3/V4, 1 = V3 only, 2 = V3 + V4 (full payout capability).
   * Only meaningful when isSeller is true.
   */
  static sellerTier(user: User): 0 | 1 | 2 {
    if (!this.isSeller(user)) return 0;
    if (this.hasV3(user) && this.hasV4(user)) return 2;
    if (this.hasV3(user)) return 1;
    return 0;
  }

  static canReceivePayout(user: User): boolean {
    return this.hasV3(user) && this.hasV4(user);
  }
}
