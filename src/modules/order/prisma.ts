import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

// Set database URL for order service
process.env.DATABASE_URL = process.env.ORDER_DATABASE_URL || 'postgresql://maysar_user:maysar_password@localhost:5432/maysar_order'

export const prisma = new PrismaClient()
