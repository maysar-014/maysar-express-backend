import { InMemoryEmailService } from './email.service';
import { notificationClient as mockNotificationClient, NotificationServiceClient } from '../../application/sagas/service-clients';

// Initialize and export single instances of infrastructure services
export const emailService = new InMemoryEmailService();
export const notificationClient: NotificationServiceClient = mockNotificationClient;

// Add other services here as needed (e.g., AuditService, SessionService)
