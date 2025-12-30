import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

// Set database URL for seller service
process.env.DATABASE_URL = process.env.SELLER_DATABASE_URL || 'postgresql://maysar_user:maysar_password@localhost:5432/maysar_seller'

export const prisma = new PrismaClient()
