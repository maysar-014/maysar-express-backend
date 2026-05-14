import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
async function main() {
  const warehouses = await (prisma as any).inventory_Warehouse.findMany({
    select: { id: true, name: true, code: true },
    take: 5
  });
  console.log(JSON.stringify(warehouses, null, 2));
  await prisma.$disconnect();
}
main().catch(console.error);
