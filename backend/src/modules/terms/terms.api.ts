import type { TermsUserType, AcceptanceMethod } from './terms.domain';

export interface UpdateTermsContentRequest {
  content: string;
}

export interface UpdateTermsContentResponse {
  id: string;
  userType: TermsUserType;
  versionLabel: string;
  updatedAt: Date;
}


export interface GetCurrentTermsResponse {
  id: string;
  userType: TermsUserType;
  versionLabel: string;
  contentUrl: string;
  contentSummary: string;
  effectiveDate: Date;
}

export interface AcceptTermsRequest {
  method: AcceptanceMethod;
}

export interface AcceptTermsResponse {
  acceptanceId: string;
  termsVersionId: string;
  acceptedAt: Date;
}

export interface TermsComplianceStatus {
  userType: TermsUserType;
  currentVersionId: string;
  currentVersionLabel: string;
  isCompliant: boolean;
  canOperate: boolean;
  requiresAction: boolean;
  actionDeadline: Date | null;
  lastAcceptedAt: Date | null;
}

export interface GetTermsStatusResponse {
  buyer: TermsComplianceStatus | null;
  seller: TermsComplianceStatus | null;
}
