/**
 * Email template types for the notification system
 */
export enum EmailTemplate {
  // User verification
  EmailVerification = 'EmailVerification',
  PhoneVerification = 'PhoneVerification',
  
  // Transaction notifications
  PaymentReceived = 'PaymentReceived',
  TicketSold = 'TicketSold',
  TicketPurchased = 'TicketPurchased',
  TicketTransferred = 'TicketTransferred',
  PaymentReleased = 'PaymentReleased',
  
  // Dispute notifications
  DisputeOpened = 'DisputeOpened',
  DisputeResolved = 'DisputeResolved',
  
  // Event notifications
  EventApproved = 'EventApproved',
  EventRejected = 'EventRejected',
  
  // Account notifications
  IdentityVerificationApproved = 'IdentityVerificationApproved',
  IdentityVerificationRejected = 'IdentityVerificationRejected',
  PasswordReset = 'PasswordReset',
}

/**
 * In-app notification types
 */
export enum InAppNotificationType {
  Info = 'Info',
  Success = 'Success',
  Warning = 'Warning',
  Error = 'Error',
}

/**
 * In-app notification entity
 */
export interface InAppNotification {
  id: string;
  userId: string;
  type: InAppNotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  read: boolean;
  createdAt: Date;
}

/**
 * Email sending result
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * SMS sending result
 */
export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
