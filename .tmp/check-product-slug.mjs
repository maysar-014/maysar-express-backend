import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Get a real published product with its slug
const product = await prisma.product.findFirst({
  where: { status: 'published' },
  include: { category: true },
  orderBy: { createdAt: 'asc' }
});

if (product) {
  console.log('=== Real Product ===');
  console.log('ID:           ', product.id);
  console.log('Name:         ', product.title || product.name);
  console.log('Brand:        ', product.brand);
  console.log('Slug:         ', product.slug);
  console.log('Category:     ', product.category?.label || product.category?.name);
  console.log('Price:        ', product.variants?.[0]?.price ?? 'see variant');
  console.log('Status:       ', product.status);
  console.log('Supplier:     ', product.supplierLocation);
  console.log('Seller ID:    ', product.sellerId);
  console.log('Created:      ', product.createdAt);
  console.log('');
  console.log('=== URLs ===');
  console.log('By ID:   GET /api/catalog/v1/products/' + product.id);
  console.log('By Slug: GET /api/catalog/v1/products/' + product.slug);
  console.log('Frontend: https://maysar.co.tz/p/' + product.slug);
} else {
  console.log('No published products found');
}

await prisma.$disconnect();
