import { PrismaClient } from '@prisma/client';
import { getModelPrefix, makeId } from '@shared/ids/id';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  const buyerId1 = makeId(getModelPrefix('User_User'));
  const buyerId2 = makeId(getModelPrefix('User_User'));
  const sellerId1 = makeId(getModelPrefix('User_User'));
  const sellerId2 = makeId(getModelPrefix('User_User'));
  const productId1 = makeId(getModelPrefix('Catalog_Product'));
  const productId2 = makeId(getModelPrefix('Catalog_Product'));
  const productId3 = makeId(getModelPrefix('Catalog_Product'));
  const productId4 = makeId(getModelPrefix('Catalog_Product'));

  const orderId1 = makeId(getModelPrefix('Order_Order'));
  const orderId2 = makeId(getModelPrefix('Order_Order'));
  const orderId3 = makeId(getModelPrefix('Order_Order'));

  // Create sample orders for testing
  const sampleOrders = [
    {
      id: orderId1,
      buyerId: buyerId1,
      sellerId: sellerId1,
      status: 'PENDING' as const,
      paymentMethod: 'CARD' as const,
      totalAmount: 25000.00,
      currency: 'TZS',
      totalWeight: 2.5,
      deliveryAddress: {
        street: '123 Main Street',
        city: 'Dar es Salaam',
        postalCode: '11101',
        country: 'TZ'
      },
      items: [
        {
          productId: productId1,
          quantity: 2,
          price: 10000.00,
          weight: 1.0,
          currency: 'TZS'
        },
        {
          productId: productId2,
          quantity: 1,
          price: 5000.00,
          weight: 0.5,
          currency: 'TZS'
        }
      ]
    },
    {
      id: orderId2,
      buyerId: buyerId2,
      sellerId: sellerId1,
      status: 'CONFIRMED' as const,
      paymentMethod: 'COD' as const,
      totalAmount: 15000.00,
      currency: 'TZS',
      totalWeight: 1.2,
      deliveryAddress: {
        street: '456 Market Road',
        city: 'Dar es Salaam',
        postalCode: '11102',
        country: 'TZ'
      },
      items: [
        {
          productId: productId3,
          quantity: 3,
          price: 5000.00,
          weight: 0.4,
          currency: 'TZS'
        }
      ]
    },
    {
      id: orderId3,
      buyerId: buyerId1,
      sellerId: sellerId2,
      status: 'DELIVERED' as const,
      paymentMethod: 'MOBILE_MONEY' as const,
      totalAmount: 75000.00,
      currency: 'TZS',
      totalWeight: 5.0,
      deliveryAddress: {
        street: '789 Business Ave',
        city: 'Arusha',
        postalCode: '23101',
        country: 'TZ'
      },
      items: [
        {
          productId: productId4,
          quantity: 1,
          price: 75000.00,
          weight: 5.0,
          currency: 'TZS'
        }
      ]
    }
  ];

  // Insert sample orders
  for (const orderData of sampleOrders) {
    const { items, ...orderFields } = orderData;

    const order = await prisma.order.create({
      data: {
        ...orderFields,
        items: {
          create: items
        }
      },
      include: {
        items: true
      }
    });

    console.log(`✅ Created order: ${order.id} with ${order.items.length} items`);
  }

  // Create sample payments
  const samplePayments = [
    {
      id: makeId(getModelPrefix('Order_Payment')),
      orderId: orderId1,
      amount: 25000.00,
      currency: 'TZS',
      method: 'CARD' as const,
      status: 'COMPLETED' as const,
      transactionId: 'txn_card_123456',
      externalRef: 'ext_ref_card_001'
    },
    {
      id: makeId(getModelPrefix('Order_Payment')),
      orderId: orderId2,
      amount: 15000.00,
      currency: 'TZS',
      method: 'COD' as const,
      status: 'PENDING' as const,
      transactionId: 'txn_cod_789012',
      externalRef: 'ext_ref_cod_002'
    },
    {
      id: makeId(getModelPrefix('Order_Payment')),
      orderId: orderId3,
      amount: 75000.00,
      currency: 'TZS',
      method: 'MOBILE_MONEY' as const,
      status: 'COMPLETED' as const,
      transactionId: 'txn_mobile_345678',
      externalRef: 'ext_ref_mobile_003'
    }
  ];

  // Insert sample payments
  for (const payment of samplePayments) {
    await prisma.payment.create({
      data: payment
    });
    console.log(`✅ Created payment: ${payment.id} for order ${payment.orderId}`);
  }

  // Create sample settlements
  const sampleSettlements = [
    {
      id: makeId(getModelPrefix('Order_Settlement')),
      orderId: orderId1,
      settlementId: 'stl_001_1234567890',
      sellerPayout: 21250.00, // 85% after 15% commission
      platformCommission: 3750.00, // 15% commission
      courierEarnings: 2000.00, // Courier fee
      currency: 'TZS',
      status: 'COMPLETED' as const,
      processedAt: new Date('2024-01-15T10:30:00Z')
    },
    {
      id: makeId(getModelPrefix('Order_Settlement')),
      orderId: orderId3,
      settlementId: 'stl_003_1234567891',
      sellerPayout: 63750.00, // 85% after 15% commission
      platformCommission: 11250.00, // 15% commission
      courierEarnings: 5000.00, // Courier fee
      currency: 'TZS',
      status: 'COMPLETED' as const,
      processedAt: new Date('2024-01-20T14:45:00Z')
    }
  ];

  // Insert sample settlements
  for (const settlement of sampleSettlements) {
    await prisma.settlement.create({
      data: settlement
    });
    console.log(`✅ Created settlement: ${settlement.id} for order ${settlement.orderId}`);
  }

  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   - ${sampleOrders.length} orders created`);
  console.log(`   - ${samplePayments.length} payments created`);
  console.log(`   - ${sampleSettlements.length} settlements created`);
  console.log('');
  console.log('🔍 Test data ready for development and testing!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
