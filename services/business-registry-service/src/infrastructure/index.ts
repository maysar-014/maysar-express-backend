export { PrismaBusinessRepository } from './repositories/prisma-business.repository';
export { getPrismaClient, disconnectPrisma } from './database/prisma-client';
export { logger } from './services/logger.service';
export { CacheService } from './services/cache.service';
export { BusinessEventPublisher } from './messaging/business-event-publisher';

import { getPrismaClient } from './database/prisma-client';
import { PrismaBusinessRepository } from './repositories/prisma-business.repository';
import { NotificationAdapter } from './adapters/notification.adapter';
import { MailerAdapter } from './adapters/mailer.adapter';
import { ComplianceAdapter } from './adapters/compliance.adapter';
import { CapabilityAdapter } from './adapters/capability.adapter';

const notificationAdapter = new NotificationAdapter();
export const mailerAdapter = new MailerAdapter(notificationAdapter);
export const complianceAdapter = new ComplianceAdapter();
export const capabilityAdapter = new CapabilityAdapter();
export const businessRepository = new PrismaBusinessRepository(getPrismaClient());
