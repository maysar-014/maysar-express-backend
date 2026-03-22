import { SMTPService, InMemoryEmailService } from './email.service';
import { notificationClient as notificationClientImpl, NotificationServiceClient } from '../../application/sagas/service-clients';

// Initialize and export single instances of infrastructure services
const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
export const emailService = smtpConfigured || process.env.NODE_ENV === 'production'
  ? new SMTPService()
  : new InMemoryEmailService();
export const notificationClient: NotificationServiceClient = notificationClientImpl;

// Add other services here as needed (e.g., AuditService, SessionService)
