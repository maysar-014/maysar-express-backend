import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

// Set database URL for payment service
process.env.DATABASE_URL = process.env.PAYMENT_DATABASE_URL || 'postgresql://maysar_user:maysar_password@localhost:5432/maysar_payment'

export const prisma = new PrismaClient()
