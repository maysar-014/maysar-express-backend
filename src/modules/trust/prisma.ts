import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

// Set database URL for trust service
process.env.DATABASE_URL = process.env.TRUST_DATABASE_URL || 'postgresql://maysar_user:maysar_password@localhost:5432/maysar_trust'

export const prisma = new PrismaClient()
