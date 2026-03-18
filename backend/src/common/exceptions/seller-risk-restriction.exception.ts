import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Thrown when a seller cannot publish a listing because risk engine limits apply
 * (e.g. unverified seller: max active listings or max total value exceeded).
 * Frontend can check error.code === 'SELLER_RISK_RESTRICTION' to show a CTA to /become-seller.
 */
export class SellerRiskRestrictionException extends HttpException {
  public readonly code = 'SELLER_RISK_RESTRICTION' as const;

  constructor(
    message: string = 'This listing exceeds the limits for unverified sellers. Complete seller onboarding at /become-seller.',
  ) {
    super(
      {
        message,
        error: 'SellerRiskRestriction',
        code: 'SELLER_RISK_RESTRICTION',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
