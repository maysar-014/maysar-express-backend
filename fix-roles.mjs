import { PrismaClient } from '@prisma/client';

const p = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

const updates = [
  { email: 'admin@maysar.co.tz', role: 'admin' },
  { email: 'courier@maysar.co.tz', role: 'courier' },
  { email: 'enabler@maysar.co.tz', role: 'enabler' },
  { email: 'seller@maysar.co.tz', role: 'seller' },
  { email: 'supplier@maysar.co.tz', role: 'supplier' },
];

for (const u of updates) {
  try {
    const r = await p.user.updateMany({ where: { email: u.email }, data: { role: u.role } });
    console.log('Updated', u.email, '->', u.role, ':', JSON.stringify(r));
  } catch(e) {
    console.log('Error', u.email, e.message.slice(0, 150));
  }
}

await p.$disconnect();
console.log('Done');
