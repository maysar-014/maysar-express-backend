import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

// Set database URL for admin service
process.env.DATABASE_URL = process.env.ADMIN_DATABASE_URL || 'postgresql://maysar_user:maysar_password@localhost:5432/maysar_admin'

export const prisma = new PrismaClient()
