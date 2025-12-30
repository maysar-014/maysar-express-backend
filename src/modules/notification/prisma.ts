import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

// Set database URL for notification service
process.env.DATABASE_URL = process.env.NOTIFICATION_DATABASE_URL || 'postgresql://maysar_user:maysar_password@localhost:5432/maysar_notification'

export const prisma = new PrismaClient()
