import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

// Set database URL for community service
process.env.DATABASE_URL = process.env.COMMUNITY_DATABASE_URL || 'postgresql://maysar_user:maysar_password@localhost:5432/maysar_community'

export const prisma = new PrismaClient()
