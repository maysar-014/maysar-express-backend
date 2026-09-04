const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user_User.findUnique({
    where: { id: 'usr_01KRFXQZC36NK3CDEWJJS21RP8' },
    select: { passwordHash: true }
  });

  console.log('Hash in DB:', user?.passwordHash?.slice(0, 30) + '...');

  const pw1 = 'Maysar@2024!';
  const pw2 = 'Maysar@2024';
  const pw3 = 'buyer@maysar.co.tz';

  const [r1, r2, r3] = await Promise.all([
    bcrypt.compare(pw1, user.passwordHash),
    bcrypt.compare(pw2, user.passwordHash),
    bcrypt.compare(pw3, user.passwordHash)
  ]);

  console.log(`"Maysar@2024!"  matches: ${r1}`);
  console.log(`"Maysar@2024"   matches: ${r2}`);
  console.log(`"buyer@maysar.co.tz" matches: ${r3}`);

  await prisma.$disconnect();
}

main().catch(console.error);
