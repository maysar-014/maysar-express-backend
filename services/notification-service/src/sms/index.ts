import { PrismaClient } from '@prisma/client';
import { container } from './infrastructure/container';
import { TYPES } from './infrastructure/types';
import { logger } from './infrastructure/services/logger.service';

export const SmsModule = {
  initialize: async () => {
    try {
      const prisma = container.get<PrismaClient>(TYPES.PrismaClient);
      await prisma.$connect();
      logger.info('SMS module initialized');
    } catch (error) {
      logger.warn('SMS module initialization failed', { error });
      throw error;
    }
  },
  shutdown: async () => {
    try {
      const prisma = container.get<PrismaClient>(TYPES.PrismaClient);
      await prisma.$disconnect();
      logger.info('SMS module shutdown complete');
    } catch (error) {
      logger.warn('SMS module shutdown failed', { error });
    }
  }
};
