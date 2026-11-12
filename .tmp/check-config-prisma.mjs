import { prisma } from '../src/config/prisma.js';

(async () => {
  try {
    const hasAccessor = typeof prisma.catalog_ConfigurationDefinition !== 'undefined';
    console.log('Has catalog_ConfigurationDefinition accessor:', hasAccessor);
    
    if (hasAccessor) {
      const d = await prisma.catalog_ConfigurationDefinition.findFirst({
        where: { productId: 'cat_pro_01M6VNHQX9TM7WM52CDSNW5Q6X', status: 'active' }
      });
      console.log('Query result:', d);
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
  await prisma.$disconnect();
})();
