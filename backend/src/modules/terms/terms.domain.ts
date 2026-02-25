export enum TermsUserType {
  Buyer = 'buyer',
  Seller = 'seller',
}

export enum TermsChangeType {
  Major = 'major',
  Minor = 'minor',
  Patch = 'patch',
}

export enum TermsStatus {
  Draft = 'draft',
  Active = 'active',
  Superseded = 'superseded',
  Retired = 'retired',
}

export enum AcceptanceMethod {
  Checkbox = 'checkbox',
  ClickThrough = 'click_through',
}

export enum AcceptanceStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Rejected = 'rejected',
  Expired = 'expired',
}

export interface TermsVersion {
  id: string;
  userType: TermsUserType;
  versionMajor: number;
  versionMinor: number;
  versionPatch: number;
  versionLabel: string;
  changeType: TermsChangeType;
  status: TermsStatus;
  contentUrl: string;
  contentHash: string;
  contentSummary: string;
  notificationDate: Date;
  effectiveDate: Date;
  gracePeriodEndsAt: Date | null;
  hardDeadlineAt: Date | null;
  previousVersionId: string | null;
  createdByUserId: string;
  createdAt: Date;
  publishedAt: Date | null;
}

export interface UserTermsAcceptance {
  id: string;
  userId: string;
  termsVersionId: string;
  userType: TermsUserType;
  status: AcceptanceStatus;
  acceptanceMethod: AcceptanceMethod | null;
  ipAddress: string | null;
  userAgent: string | null;
  notifiedAt: Date;
  respondedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface UserTermsState {
  id: string;
  userId: string;
  userType: TermsUserType;
  currentTermsVersionId: string;
  lastAcceptedVersionId: string | null;
  lastAcceptedAt: Date | null;
  isCompliant: boolean;
  canOperate: boolean;
  requiresAction: boolean;
  actionDeadline: Date | null;
  updatedAt: Date;
}
