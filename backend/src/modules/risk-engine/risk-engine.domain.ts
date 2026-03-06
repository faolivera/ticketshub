/**
 * Risk level for checkout (determines step-up verification requirements).
 */
export enum RiskLevel {
  LOW = 'LOW',
  MED = 'MED',
  HIGH = 'HIGH',
}

/**
 * Result of checkout risk evaluation.
 * Used by backend to enforce gates and by BFF to tell frontend which verifications to request.
 */
export interface RiskEvaluation {
  riskLevel: RiskLevel;
  /** V1 (email) is always required to pay. */
  requireV1: true;
  /** When true, phone (V2) must be verified before purchase. */
  requireV2: boolean;
}
