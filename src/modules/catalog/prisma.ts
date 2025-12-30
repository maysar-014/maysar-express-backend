import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

// Set database URL for catalog service
process.env.DATABASE_URL = process.env.CATALOG_DATABASE_URL || 'postgresql://maysar_user:maysar_password@localhost:5432/maysar_catalog'

export const prisma = new PrismaClient()
