import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

// Set database URL for inventory service
process.env.DATABASE_URL = process.env.INVENTORY_DATABASE_URL || 'postgresql://maysar_user:maysar_password@localhost:5432/maysar_inventory'

export const prisma = new PrismaClient()
