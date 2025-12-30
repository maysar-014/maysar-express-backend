import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

// Set database URL for logistics service
process.env.DATABASE_URL = process.env.LOGISTICS_DATABASE_URL || 'postgresql://maysar_user:maysar_password@localhost:5432/maysar_logistics'

export const prisma = new PrismaClient()
