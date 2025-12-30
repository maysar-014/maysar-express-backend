import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

// Set database URL for analytics service
process.env.DATABASE_URL = process.env.ANALYTICS_DATABASE_URL || 'postgresql://maysar_user:maysar_password@localhost:5432/maysar_analytics'

export const prisma = new PrismaClient()
