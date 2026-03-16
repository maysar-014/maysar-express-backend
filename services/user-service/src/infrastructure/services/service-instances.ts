import { SMTPService } from './email.service';
import { notificationClient as notificationClientImpl, NotificationServiceClient } from '../../application/sagas/service-clients';

// Initialize and export single instances of infrastructure services
export const emailService = new SMTPService();
export const notificationClient: NotificationServiceClient = notificationClientImpl;

// Add other services here as needed (e.g., AuditService, SessionService)
