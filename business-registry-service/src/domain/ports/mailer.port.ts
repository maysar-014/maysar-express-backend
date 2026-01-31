/**
 * Mailer Port - Domain interface for email sending
 * Implemented by infrastructure adapters (SMTP, notification-service HTTP, etc.)
 */
export interface IMailerAdapter {
  sendVerificationEmail(params: {
    to: string;
    businessName: string;
    businessId: string;
    verificationLink?: string;
  }): Promise<void>;

  sendBusinessVerifiedEmail(params: {
    to: string;
    businessName: string;
    businessId: string;
  }): Promise<void>;
}
