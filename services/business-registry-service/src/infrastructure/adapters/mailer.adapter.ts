import { IMailerAdapter } from '../../domain/ports';
import { INotificationAdapter } from '../../domain/ports/notification.port';
import { logger } from '../services/logger.service';

/**
 * Mailer Adapter - Sends emails via notification service or fallback
 * Uses notification adapter when available; otherwise logs (dev mode)
 */
export class MailerAdapter implements IMailerAdapter {
  constructor(private readonly notificationAdapter?: INotificationAdapter) {}

  async sendVerificationEmail(params: {
    to: string;
    businessName: string;
    businessId: string;
    verificationLink?: string;
  }): Promise<void> {
    const subject = 'Verify your business registration - Maysar';
    const content = `Hello,\n\nYour business "${params.businessName}" has been registered. Please verify your business to activate your account.\n\nBusiness ID: ${params.businessId}${params.verificationLink ? `\n\nVerification link: ${params.verificationLink}` : ''}\n\nBest regards,\nMaysar Team`;
    const contentHtml = `<p>Hello,</p><p>Your business "<strong>${params.businessName}</strong>" has been registered. Please verify your business to activate your account.</p><p>Business ID: ${params.businessId}</p>${params.verificationLink ? `<p><a href="${params.verificationLink}">Verify your business</a></p>` : ''}<p>Best regards,<br>Maysar Team</p>`;

    if (this.notificationAdapter) {
      await this.notificationAdapter.sendNotification({
        userId: params.businessId,
        channel: 'email',
        subject,
        content,
        contentHtml,
        deliveryAddress: params.to,
        metadata: { businessId: params.businessId, type: 'business_verification' }
      });
    } else {
      logger.info('MailerAdapter: sendVerificationEmail (no notification adapter)', {
        to: params.to.substring(0, 20),
        businessId: params.businessId,
        businessName: params.businessName
      });
    }
  }

  async sendBusinessVerifiedEmail(params: {
    to: string;
    businessName: string;
    businessId: string;
  }): Promise<void> {
    const subject = 'Your business has been verified - Maysar';
    const content = `Hello,\n\nYour business "${params.businessName}" has been verified and is now active. You can now access all capabilities on the Maysar marketplace.\n\nBusiness ID: ${params.businessId}\n\nBest regards,\nMaysar Team`;
    const contentHtml = `<p>Hello,</p><p>Your business "<strong>${params.businessName}</strong>" has been verified and is now active.</p><p>You can now access all capabilities on the Maysar marketplace.</p><p>Best regards,<br>Maysar Team</p>`;

    if (this.notificationAdapter) {
      await this.notificationAdapter.sendNotification({
        userId: params.businessId,
        channel: 'email',
        subject,
        content,
        contentHtml,
        deliveryAddress: params.to,
        metadata: { businessId: params.businessId, type: 'business_verified' }
      });
    } else {
      logger.info('MailerAdapter: sendBusinessVerifiedEmail (no notification adapter)', {
        to: params.to.substring(0, 20),
        businessId: params.businessId
      });
    }
  }
}
