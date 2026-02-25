export enum TermsUserType {
  Buyer = 'buyer',
  Seller = 'seller',
}

export enum AcceptanceMethod {
  Checkbox = 'checkbox',
  ClickThrough = 'click_through',
}

export interface GetCurrentTermsResponse {
  id: string;
  userType: TermsUserType;
  versionLabel: string;
  contentUrl: string;
  contentSummary: string;
  effectiveDate: string;
}

export interface AcceptTermsRequest {
  method: AcceptanceMethod;
}

export interface AcceptTermsResponse {
  acceptanceId: string;
  termsVersionId: string;
  acceptedAt: string;
}

export interface TermsComplianceStatus {
  userType: TermsUserType;
  currentVersionId: string;
  currentVersionLabel: string;
  isCompliant: boolean;
  canOperate: boolean;
  requiresAction: boolean;
  actionDeadline: string | null;
  lastAcceptedAt: string | null;
}

export interface GetTermsStatusResponse {
  buyer: TermsComplianceStatus | null;
  seller: TermsComplianceStatus | null;
}

export interface TermsAcceptanceData {
  termsVersionId: string;
  method: AcceptanceMethod;
}
