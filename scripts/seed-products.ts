'use strict';
// Product seed script for Tanzania marketplace
// Run: npx ts-node -r tsconfig-paths/register scripts/seed-products.ts

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { makeId, getModelPrefix } from '../shared/ids/id';

dotenv.config();
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

const SELLER_ID = 'usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z'; // seeded seller

// ─── Default warehouse for stock items ────────────────────────────────────────
const WAREHOUSE_ID = 'wh_seed_dar_central_01';
const WAREHOUSE_CODE = 'DSM-SEED-01';

// ─── Unsplash source image URLs ───────────────────────────────────────────────
const img = (keyword: string, w = 800, h = 600) =>
  `https://source.unsplash.com/${w}x${h}/?${encodeURIComponent(keyword)}`;

// ─── Categories ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  { name: 'Simu na Teknolojia',  slug: 'simu-teknolojia',  description: 'Simu za mkononi, kompyuta, na vifaa vya teknolojia' },
  { name: 'Mavazi na Mitindo',   slug: 'mavazi-mitindo',   description: 'Nguo, viatu, na vifaa vya mitindo' },
  { name: 'Chakula na Vinywaji', slug: 'chakula-vinywaji', description: 'Vyakula vya asili, viungo, na vinywaji' },
  { name: 'Nyumba na Samani',    slug: 'nyumba-samani',    description: 'Samani, mapambo ya nyumba, na vifaa vya jikoni' },
  { name: 'Afya na Uzuri',       slug: 'afya-uzuri',       description: 'Bidhaa za afya, dawa za asili, na vipodozi' },
  { name: 'Kilimo na Mazao',     slug: 'kilimo-mazao',     description: 'Mbegu, mbolea, na zana za kilimo' },
  { name: 'Magari na Vipande',   slug: 'magari-vipande',   description: 'Vipande vya magari na pikipiki' },
  { name: 'Michezo na Burudani', slug: 'michezo-burudani', description: 'Vifaa vya michezo na burudani' },
];

// ─── Products ─────────────────────────────────────────────────────────────────
// COD/freeDelivery mix:
//   neither  → codAccepted: false, freeDelivery: false
//   COD only → codAccepted: true,  freeDelivery: false
//   free del → codAccepted: false, freeDelivery: true
//   both     → codAccepted: true,  freeDelivery: true

interface SeedProduct {
  title: string;
  description: string;
  price: number;        // TZS
  category: string;     // slug
  images: string[];
  tags: string[];
  condition: 'new' | 'used';
  codAccepted: boolean;
  freeDelivery: boolean;
  inventoryCount: number; // >0 = in_stock
  weight: number;         // kg
}

const PRODUCTS: SeedProduct[] = [
  // ── Simu na Teknolojia ──────────────────────────────────────────────────────
  {
    title: 'Samsung Galaxy A15 - 128GB',
    description: 'Simu mpya ya Samsung Galaxy A15 yenye kumbukumbu ya 128GB na RAM ya 4GB. Betri ya 5000mAh inayodumu siku nzima. Kamera ya 50MP.',
    price: 385_000,
    category: 'simu-teknolojia',
    images: [img('samsung galaxy phone'), img('smartphone black'), img('mobile phone screen')],
    tags: ['samsung', 'android', 'simu', 'galaxy', 'smartphone'],
    condition: 'new',
    codAccepted: false,  // neither
    freeDelivery: false,
    inventoryCount: 15,
    weight: 0.2,
  },
  {
    title: 'Earbuds za Bluetooth - Wireless',
    description: 'Earbuds za wireless zenye ubora wa sauti wa hali ya juu. Betri inayodumu masaa 6. Inafaa kwa simu zote za Android na iPhone.',
    price: 45_000,
    category: 'simu-teknolojia',
    images: [img('wireless earbuds white'), img('bluetooth earphones'), img('earbuds case')],
    tags: ['earbuds', 'bluetooth', 'wireless', 'sauti', 'headphones'],
    condition: 'new',
    codAccepted: true,   // COD only
    freeDelivery: false,
    inventoryCount: 30,
    weight: 0.1,
  },
  {
    title: 'Power Bank 20000mAh - Charge Haraka',
    description: 'Power bank yenye uwezo wa 20000mAh. Inaweza kuchaji simu 4-5 mara. Ina ports 2 za USB na 1 ya Type-C.',
    price: 55_000,
    category: 'simu-teknolojia',
    images: [img('power bank portable charger'), img('portable battery'), img('phone charging')],
    tags: ['power bank', 'charger', 'betri', 'portable', 'usb'],
    condition: 'new',
    codAccepted: true,   // both
    freeDelivery: true,
    inventoryCount: 25,
    weight: 0.4,
  },
  {
    title: 'Laptop HP 15 - Core i5 8GB RAM',
    description: 'Laptop ya HP yenye processor ya Intel Core i5, RAM ya 8GB, na SSD ya 256GB. Inafaa kwa kazi za ofisi, masomo, na biashara.',
    price: 1_250_000,
    category: 'simu-teknolojia',
    images: [img('hp laptop computer'), img('laptop office desk'), img('computer screen work')],
    tags: ['laptop', 'hp', 'kompyuta', 'core i5', 'office'],
    condition: 'new',
    codAccepted: false,  // free delivery only
    freeDelivery: true,
    inventoryCount: 5,
    weight: 1.8,
  },

  // ── Mavazi na Mitindo ───────────────────────────────────────────────────────
  {
    title: 'Kanzu ya Kiswahili - Hariri',
    description: 'Kanzu nzuri ya hariri iliyoshonwa Tanzania. Inafaa kwa sherehe, misiba, na matukio ya kidini. Rangi nyeupe safi.',
    price: 85_000,
    category: 'mavazi-mitindo',
    images: [img('white kanzu muslim dress'), img('traditional african clothing white'), img('swahili fashion')],
    tags: ['kanzu', 'hariri', 'mavazi', 'sherehe', 'kiswahili'],
    condition: 'new',
    codAccepted: true,   // COD only
    freeDelivery: false,
    inventoryCount: 20,
    weight: 0.5,
  },
  {
    title: 'Kitenge cha Tanzania - Mita 6',
    description: 'Kitenge cha asili cha Tanzania chenye rangi nzuri na michoro ya kipekee. Mita 6 zinazotosha kushona nguo 2.',
    price: 35_000,
    category: 'mavazi-mitindo',
    images: [img('african kitenge fabric colorful'), img('tanzania fabric pattern'), img('african textile')],
    tags: ['kitenge', 'nguo', 'fabric', 'tanzania', 'rangi'],
    condition: 'new',
    codAccepted: true,   // both
    freeDelivery: true,
    inventoryCount: 50,
    weight: 0.8,
  },
  {
    title: 'Viatu vya Ngozi - Wanaume',
    description: 'Viatu vya ngozi ya kweli vilivyotengenezwa Tanzania. Vina ubora wa hali ya juu na vinafaa kwa ofisi na sherehe. Saizi 40-45.',
    price: 120_000,
    category: 'mavazi-mitindo',
    images: [img('leather shoes men formal'), img('brown leather shoes'), img('formal shoes office')],
    tags: ['viatu', 'ngozi', 'wanaume', 'formal', 'leather'],
    condition: 'new',
    codAccepted: false,  // neither
    freeDelivery: false,
    inventoryCount: 12,
    weight: 0.9,
  },
  {
    title: 'Begi la Mkoba - Wanawake',
    description: 'Mkoba wa kisasa wa wanawake uliofanywa kwa ngozi ya synthetic. Una nafasi kubwa na mifuko mingi.',
    price: 65_000,
    category: 'mavazi-mitindo',
    images: [img('women handbag leather'), img('fashion bag ladies'), img('purse accessories')],
    tags: ['mkoba', 'begi', 'wanawake', 'fashion', 'handbag'],
    condition: 'new',
    codAccepted: false,  // free delivery only
    freeDelivery: true,
    inventoryCount: 18,
    weight: 0.6,
  },

  // ── Chakula na Vinywaji ─────────────────────────────────────────────────────
  {
    title: 'Mchele wa Kilimo - Kilo 25',
    description: 'Mchele mzuri wa Tanzania uliopandwa Mbeya. Mfuko wa kilo 25. Unafaa kwa kupika wali, pilau, na biryani.',
    price: 62_000,
    category: 'chakula-vinywaji',
    images: [img('rice sack white'), img('rice grains food'), img('rice bag market')],
    tags: ['mchele', 'chakula', 'rice', 'mbeya', 'kilimo'],
    condition: 'new',
    codAccepted: true,   // both
    freeDelivery: true,
    inventoryCount: 100,
    weight: 25,
  },
  {
    title: 'Viungo vya Pilau - Mchanganyiko',
    description: 'Viungo vya asili vya kupikia pilau, biryani, na mchuzi. Mchanganyiko wa pilipili, karafuu, iliki. Gramu 500.',
    price: 8_500,
    category: 'chakula-vinywaji',
    images: [img('spices colorful market'), img('pilau spices tanzania'), img('cooking spices herbs')],
    tags: ['viungo', 'pilau', 'spices', 'chakula', 'biryani'],
    condition: 'new',
    codAccepted: true,   // both
    freeDelivery: true,
    inventoryCount: 200,
    weight: 0.5,
  },
  {
    title: 'Asali ya Asili - Lita 1',
    description: 'Asali safi ya asili kutoka misitu ya Tanzania. Haina sukari wala kemikali. Inafaa kwa afya, chai, na dawa za asili.',
    price: 28_000,
    category: 'chakula-vinywaji',
    images: [img('honey jar natural'), img('pure honey golden'), img('honey bee natural')],
    tags: ['asali', 'honey', 'asili', 'afya', 'natural'],
    condition: 'new',
    codAccepted: true,   // COD only
    freeDelivery: false,
    inventoryCount: 40,
    weight: 1.2,
  },
  {
    title: 'Kahawa ya Kilimanjaro - Gramu 500',
    description: 'Kahawa ya hali ya juu kutoka milima ya Kilimanjaro. Ina ladha tamu na harufu nzuri. Inafaa kwa espresso na French press.',
    price: 22_000,
    category: 'chakula-vinywaji',
    images: [img('kilimanjaro coffee beans'), img('coffee roasted beans'), img('coffee cup morning')],
    tags: ['kahawa', 'coffee', 'kilimanjaro', 'arabica', 'tanzania'],
    condition: 'new',
    codAccepted: false,  // free delivery only
    freeDelivery: true,
    inventoryCount: 60,
    weight: 0.5,
  },

  // ── Nyumba na Samani ────────────────────────────────────────────────────────
  {
    title: 'Sufuria ya Aluminium - Seti ya 5',
    description: 'Seti ya sufuria 5 za aluminium zenye ubora wa hali ya juu. Zinafaa kwa kupikia jiko la gesi na mkaa.',
    price: 45_000,
    category: 'nyumba-samani',
    images: [img('aluminum cooking pots set'), img('kitchen pots cookware'), img('sufuria cooking')],
    tags: ['sufuria', 'jikoni', 'aluminium', 'kupikia', 'cookware'],
    condition: 'new',
    codAccepted: true,   // COD only
    freeDelivery: false,
    inventoryCount: 30,
    weight: 3.5,
  },
  {
    title: 'Godoro la Foam - Inchi 6',
    description: 'Godoro la foam la inchi 6 lenye ubora wa hali ya juu. Linapatikana kwa saizi ya single, double, na queen.',
    price: 185_000,
    category: 'nyumba-samani',
    images: [img('foam mattress bedroom'), img('mattress white bed'), img('sleeping mattress')],
    tags: ['godoro', 'mattress', 'kulala', 'foam', 'bedroom'],
    condition: 'new',
    codAccepted: true,   // both
    freeDelivery: true,
    inventoryCount: 8,
    weight: 12,
  },
  {
    title: 'Meza ya Jikoni - Mbao',
    description: 'Meza nzuri ya jikoni iliyotengenezwa kwa mbao ya Tanzania. Ina saizi ya 120x60cm. Rangi ya kahawia asili.',
    price: 280_000,
    category: 'nyumba-samani',
    images: [img('wooden kitchen table'), img('dining table wood'), img('furniture table home')],
    tags: ['meza', 'mbao', 'jikoni', 'furniture', 'samani'],
    condition: 'new',
    codAccepted: false,  // neither
    freeDelivery: false,
    inventoryCount: 4,
    weight: 25,
  },

  // ── Afya na Uzuri ───────────────────────────────────────────────────────────
  {
    title: 'Mafuta ya Nazi - Lita 1',
    description: 'Mafuta ya nazi safi ya asili kutoka pwani ya Tanzania. Inafaa kwa kupikia, nywele, na ngozi. Haina kemikali.',
    price: 18_000,
    category: 'afya-uzuri',
    images: [img('coconut oil natural'), img('coconut oil jar'), img('natural oil beauty')],
    tags: ['mafuta', 'nazi', 'coconut oil', 'asili', 'nywele'],
    condition: 'new',
    codAccepted: true,   // both
    freeDelivery: true,
    inventoryCount: 80,
    weight: 1.0,
  },
  {
    title: 'Sabuni ya Mzizi wa Mti - Asili',
    description: 'Sabuni ya asili iliyotengenezwa kwa mzizi wa mti wa Tanzania. Inafaa kwa ngozi nyeti. Haina kemikali hatari.',
    price: 12_000,
    category: 'afya-uzuri',
    images: [img('natural herbal soap'), img('organic soap bar'), img('natural beauty soap')],
    tags: ['sabuni', 'asili', 'ngozi', 'herbal', 'natural'],
    condition: 'new',
    codAccepted: false,  // free delivery only
    freeDelivery: true,
    inventoryCount: 100,
    weight: 0.2,
  },

  // ── Kilimo na Mazao ─────────────────────────────────────────────────────────
  {
    title: 'Mbegu za Nyanya - Hybrid F1',
    description: 'Mbegu za nyanya za hybrid F1 zinazotoa mavuno mengi. Zinastahimili magonjwa. Gramu 10 zinazotosha kupanda ekari moja.',
    price: 15_000,
    category: 'kilimo-mazao',
    images: [img('tomato seeds farming'), img('vegetable seeds packet'), img('tomato plant growing')],
    tags: ['mbegu', 'nyanya', 'kilimo', 'hybrid', 'farming'],
    condition: 'new',
    codAccepted: true,   // COD only
    freeDelivery: false,
    inventoryCount: 150,
    weight: 0.05,
  },
  {
    title: 'Jembe la Kilimo - Chuma',
    description: 'Jembe zuri la chuma lenye mpini wa mbao. Linafaa kwa kulima ardhi ngumu. Linatengenezwa Tanzania na linastahimili muda mrefu.',
    price: 25_000,
    category: 'kilimo-mazao',
    images: [img('hoe farming tool'), img('garden hoe agriculture'), img('farming tools africa')],
    tags: ['jembe', 'kilimo', 'zana', 'chuma', 'farming'],
    condition: 'new',
    codAccepted: false,  // neither
    freeDelivery: false,
    inventoryCount: 40,
    weight: 1.5,
  },

  // ── Michezo na Burudani ─────────────────────────────────────────────────────
  {
    title: 'Mpira wa Miguu - Ukubwa 5',
    description: 'Mpira wa miguu wa ukubwa 5 unaofaa kwa mechi za rasmi na mazoezi. Unastahimili matumizi ya nje. Rangi nyeusi na nyeupe.',
    price: 35_000,
    category: 'michezo-burudani',
    images: [img('football soccer ball'), img('soccer ball grass'), img('football sport')],
    tags: ['mpira', 'football', 'michezo', 'soccer', 'sport'],
    condition: 'new',
    codAccepted: true,   // both
    freeDelivery: true,
    inventoryCount: 25,
    weight: 0.4,
  },
  {
    title: 'Bao la Michezo - Mbao ya Asili',
    description: 'Bao la michezo la jadi la Tanzania lililochongwa kwa mbao ya asili. Linakuja na vijiwe 64. Mchezo wa akili na burudani.',
    price: 45_000,
    category: 'michezo-burudani',
    images: [img('bao board game africa'), img('african board game wood'), img('traditional game tanzania')],
    tags: ['bao', 'mchezo', 'mbao', 'jadi', 'burudani'],
    condition: 'new',
    codAccepted: true,   // COD only
    freeDelivery: false,
    inventoryCount: 15,
    weight: 1.2,
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║         Maysar Tanzania Product Seed Script              ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // ── Step 1: Ensure warehouse exists ─────────────────────────────────────
  console.log('🏭 Ensuring seed warehouse...');
  const existingWarehouse = await (prisma as any).inventory_Warehouse.findUnique({
    where: { id: WAREHOUSE_ID },
  });
  if (existingWarehouse) {
    console.log(`  ✓ Warehouse exists: ${existingWarehouse.name}`);
  } else {
    await (prisma as any).inventory_Warehouse.create({
      data: {
        id: WAREHOUSE_ID,
        code: WAREHOUSE_CODE,
        name: 'Dar es Salaam Seed Warehouse',
        type: 'central',
        address: { city: 'Dar es Salaam', region: 'Dar es Salaam', country: 'Tanzania' },
        capacity: { units: 10000 },
        operatingHours: { mon: '08:00-17:00', fri: '08:00-17:00' },
      },
    });
    console.log('  ✓ Created seed warehouse');
  }

  // ── Step 2: Seed categories ──────────────────────────────────────────────
  console.log('\n📂 Seeding categories...');
  const categoryMap = new Map<string, string>(); // slug → id

  for (const cat of CATEGORIES) {
    const existing = await (prisma as any).category.findUnique({ where: { slug: cat.slug } });
    if (existing) {
      categoryMap.set(cat.slug, existing.id);
      console.log(`  ✓ Category exists: ${cat.name}`);
    } else {
      const id = makeId(getModelPrefix('Catalog'));
      await (prisma as any).category.create({
        data: {
          id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          displayOrder: CATEGORIES.indexOf(cat),
          isActive: true,
        },
      });
      categoryMap.set(cat.slug, id);
      console.log(`  ✓ Created category: ${cat.name}`);
    }
  }

  // ── Step 3: Seed products ────────────────────────────────────────────────
  console.log('\n📦 Seeding products...');
  let created = 0;
  let skipped = 0;

  for (const product of PRODUCTS) {
    const categoryId = categoryMap.get(product.category);
    if (!categoryId) {
      console.warn(`  ⚠ Category not found for: ${product.title}`);
      continue;
    }

    const slug =
      product.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 100) +
      '-' +
      Math.random().toString(36).slice(2, 6);

    const productId = makeId(getModelPrefix('Catalog'));
    const variantId = makeId(getModelPrefix('Catalog'));

    try {
      // Create product
      await (prisma as any).product.create({
        data: {
          id: productId,
          sellerId: SELLER_ID,
          title: product.title,
          description: product.description,
          categoryId,
          slug,
          status: 'published',
          visibility: 'public',
          tags: product.tags,
          codAccepted: product.codAccepted,
          freeDelivery: product.freeDelivery,
          condition: product.condition,
          qualityScore: 75,
          seoTitle: product.title,
          shortSeoDescription: product.description.slice(0, 160),
        },
      });

      // Create default variant
      await (prisma as any).productVariant.create({
        data: {
          id: variantId,
          productId,
          sku: `SKU-${productId.slice(-8).toUpperCase()}`,
          name: product.title,
          price: product.price,
          inventoryPolicy: 'deny',
          weight: product.weight,
          status: 'active',
        },
      });

      // Create stock item so inventory shows correctly
      if (product.inventoryCount > 0) {
        await (prisma as any).inventory_StockItem.create({
          data: {
            id: makeId(getModelPrefix('Catalog')),
            productVariantId: variantId,
            warehouseId: WAREHOUSE_ID,
            sku: `SKU-${productId.slice(-8).toUpperCase()}`,
            quantityAvailable: product.inventoryCount,
            quantityReserved: 0,
            quantityDamaged: 0,
            quantityOnOrder: 0,
            reorderPoint: Math.max(2, Math.floor(product.inventoryCount * 0.1)),
            maxStock: product.inventoryCount * 3,
            unitCost: Math.floor(product.price * 0.7),
            status: 'active',
            batchNumber: `SEED-${new Date().getFullYear()}`,
            locationCode: 'SEED-01',
          },
        });
      }

      // Create media refs for images
      for (let i = 0; i < product.images.length; i++) {
        const mediaId = makeId(getModelPrefix('Catalog'));
        await (prisma as any).mediaRef.create({
          data: {
            id: mediaId,
            entityType: 'product',
            entityId: productId,
            mediaType: 'image',
            url: product.images[i],
            altText: `${product.title} - picha ${i + 1}`,
            displayOrder: i,
            isPrimary: i === 0,
            uploadedBy: SELLER_ID,
          },
        });
      }

      const flags = [
        product.codAccepted ? 'COD' : null,
        product.freeDelivery ? 'FREE DEL' : null,
      ].filter(Boolean).join('+') || 'standard';

      console.log(`  ✓ ${product.title} (TZS ${product.price.toLocaleString()}) [${flags}] stock:${product.inventoryCount}`);
      created++;
    } catch (err: any) {
      if (err.message?.includes('Unique constraint')) {
        console.log(`  ↷ Skipped (exists): ${product.title}`);
        skipped++;
      } else {
        console.error(`  ✗ Failed: ${product.title} — ${err.message}`);
      }
    }
  }

  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║  Seed Complete ✓                                         ║`);
  console.log(`║  Categories: ${CATEGORIES.length.toString().padEnd(44)}║`);
  console.log(`║  Products created: ${created.toString().padEnd(38)}║`);
  console.log(`║  Products skipped: ${skipped.toString().padEnd(38)}║`);
  console.log(`╚══════════════════════════════════════════════════════════╝\n`);
  console.log('  Seller ID:', SELLER_ID);
  console.log('  Login as seller@maysar.co.tz / Maysar@2024! to manage products\n');
}

main()
  .catch((err) => {
    console.error('\n❌ Seed failed:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
