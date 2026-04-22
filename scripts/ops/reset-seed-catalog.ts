import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { Prisma, PrismaClient } from '@prisma/client';

const RESET_CONFIRM_TOKEN = 'clear-catalog-data';
const DEFAULT_SELLER_PASSWORD = process.env.SEED_SELLER_PASSWORD || 'MaysarSeller#2026!';
const USER_INDEX_SECRET = process.env.CATALOG_SEED_USER_INDEX_SECRET || 'maysar-catalog-seed-index-secret';
const CURRENCY = 'TZS';

type SellerSeed = {
  slug: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  city: string;
  region: string;
  street: string;
  postalCode: string;
  publicCode: string;
  businessName: string;
  registrationNumber: string;
  taxId: string;
  website: string;
  description: string;
  industries: string[];
  codEnabled: boolean;
  codDailyLimit: number;
  leadTimeLabel: string;
};

type CategorySeed = {
  rootSlug: string;
  rootName: string;
  rootDescription: string;
  rootImageTerms: string[];
  leafSlug: string;
  leafName: string;
  leafDescription: string;
  leafImageTerms: string[];
  attributes: Array<{
    name: string;
    displayLabel: string;
    type: 'TEXT' | 'NUMBER' | 'SELECT' | 'BOOLEAN';
    options?: string[];
    isRequired?: boolean;
    placeholder?: string;
  }>;
};

type VariantSeed = {
  name: string;
  skuSuffix: string;
  price: number;
  compareAtPrice?: number;
  costPrice: number;
  weightKg?: number;
  dimensionsCm: { length: number; width: number; height: number };
  attributes: Record<string, unknown>;
  stock: {
    warehouseSlug: string;
    quantityAvailable: number;
    quantityReserved: number;
    quantityDamaged: number;
    quantityOnOrder: number;
    reorderPoint: number;
    maxStock: number;
    unitCost: number;
    batchCode: string;
    locationCode: string;
  };
};

type ProductSeed = {
  slug: string;
  sellerSlug: string;
  categoryLeafSlug: string;
  brand: string;
  productName: string;
  model?: string;
  gtin?: string;
  mpn?: string;
  description: string;
  shortSeoDescription: string;
  generatedDescription: string;
  minimumOrderQuantity: number;
  supplierLocation: string;
  structuredAttributes: Record<string, string>;
  seoKeywords: string[];
  paymentOptions: string[];
  supportsCod: boolean;
  enablerEnabled: boolean;
  enablerCommissionRate?: number;
  qualityScore: number;
  imageTerms: string[];
  imageUrls?: string[];
  variants: VariantSeed[];
};

type WarehouseSeed = {
  slug: string;
  code: string;
  name: string;
  type: 'central' | 'regional' | 'store';
  city: string;
  region: string;
  street: string;
  postalCode: string;
  capacityUnits: number;
};

const SELLERS: SellerSeed[] = [
  {
    slug: 'kariakoo-pantry',
    firstName: 'Asha',
    lastName: 'Mwakalobo',
    email: 'asha.kariakoo@maysar.co.tz',
    phoneNumber: '+255700111201',
    city: 'Dar es Salaam',
    region: 'Dar es Salaam',
    street: 'Swahili Street, Kariakoo Block 4',
    postalCode: '11101',
    publicCode: 'MYS-SLR-KAR1',
    businessName: 'Kariakoo Pantry Wholesale',
    registrationNumber: 'TZ-DAR-2026-41011',
    taxId: '120450901',
    website: 'https://kariakoopantry.maysar.co.tz',
    description: 'High-turn pantry wholesaler serving shops, mini-markets, and apartment resellers across central Dar es Salaam.',
    industries: ['pantry', 'groceries', 'household'],
    codEnabled: true,
    codDailyLimit: 900000,
    leadTimeLabel: 'Same-day dispatch for confirmed urban orders',
  },
  {
    slug: 'arusha-home-tech',
    firstName: 'Neema',
    lastName: 'Lema',
    email: 'neema.tech@maysar.co.tz',
    phoneNumber: '+255700111202',
    city: 'Arusha',
    region: 'Arusha',
    street: 'Sokoine Road, Kaloleni Trade Center',
    postalCode: '23104',
    publicCode: 'MYS-SLR-ARU1',
    businessName: 'Arusha Home Tech Traders',
    registrationNumber: 'TZ-ARU-2026-31807',
    taxId: '120450902',
    website: 'https://arushahometech.maysar.co.tz',
    description: 'Curated home appliance and practical lifestyle seller with careful packaging and warranty handling.',
    industries: ['appliances', 'home', 'lifestyle'],
    codEnabled: false,
    codDailyLimit: 0,
    leadTimeLabel: 'Dispatch within 24 hours for stocked appliance items',
  },
  {
    slug: 'mwanza-style-goods',
    firstName: 'Joseph',
    lastName: 'Mabula',
    email: 'joseph.style@maysar.co.tz',
    phoneNumber: '+255700111203',
    city: 'Mwanza',
    region: 'Mwanza',
    street: 'Makongoro Road, Nyakato Retail Hub',
    postalCode: '33112',
    publicCode: 'MYS-SLR-MWA1',
    businessName: 'Mwanza Style Goods',
    registrationNumber: 'TZ-MWA-2026-22718',
    taxId: '120450903',
    website: 'https://mwanzastyle.maysar.co.tz',
    description: 'Fashion-forward seller focused on durable everyday bags and footwear for students, commuters, and retail boutiques.',
    industries: ['fashion', 'footwear', 'bags'],
    codEnabled: true,
    codDailyLimit: 550000,
    leadTimeLabel: 'Ships next morning with COD available on qualified urban routes',
  },
];

const WAREHOUSES: WarehouseSeed[] = [
  {
    slug: 'dar-central',
    code: 'DSM-CENTRAL',
    name: 'Dar Central Fulfilment Hub',
    type: 'central',
    city: 'Dar es Salaam',
    region: 'Dar es Salaam',
    street: 'Nyerere Road Logistics Yard',
    postalCode: '12110',
    capacityUnits: 18000,
  },
  {
    slug: 'arusha-regional',
    code: 'ARU-REG',
    name: 'Arusha Regional Stock Point',
    type: 'regional',
    city: 'Arusha',
    region: 'Arusha',
    street: 'Nelson Mandela Road Warehouse Park',
    postalCode: '23107',
    capacityUnits: 9500,
  },
  {
    slug: 'mwanza-store',
    code: 'MWZ-STORE',
    name: 'Mwanza Seller Dispatch Store',
    type: 'store',
    city: 'Mwanza',
    region: 'Mwanza',
    street: 'Capri Point Trade Strip',
    postalCode: '33103',
    capacityUnits: 5200,
  },
];

const DIRECT_IMAGE_URLS = {
  oilA: 'https://images.unsplash.com/photo-1720468750623-39e9a09f5067?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Y29va2luZyUyMG9pbHxlbnwwfHwwfHx8MA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000',
  oilB: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8Y29va2luZyUyMG9pbHxlbnwwfHwwfHx8MA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000',
  oilC: 'https://images.unsplash.com/photo-1638324396229-632af05042dd?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8Y29va2luZyUyMG9pbHxlbnwwfHwwfHx8MA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000',
  riceBag: 'https://images.unsplash.com/photo-1675735989549-917643fa6b2d?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000',
  backpackBlack: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YmFja3BhY2t8ZW58MHx8MHx8fDA%3D&ixlib=rb-4.1.0&q=60&w=3000',
  backpackLeather: 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8YmFja3BhY2t8ZW58MHx8MHx8fDA%3D&ixlib=rb-4.1.0&q=60&w=3000',
  sneakers: 'https://images.unsplash.com/photo-1770736261634-5f93cb918191?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000',
  kettle: 'https://images.unsplash.com/photo-1748408082799-94daff13e792?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000',
  kitchenAppliances: 'https://images.unsplash.com/photo-1761953881694-b98b238f87bb?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fGJsZW5kZXIlMjBraXRjaGVufGVufDB8fDB8fHww&ixlib=rb-4.1.0&q=60&w=3000',
} as const;

const CATEGORIES: CategorySeed[] = [
  {
    rootSlug: 'food-beverages',
    rootName: 'Food & Beverages',
    rootDescription: 'Everyday pantry stock, packaged staples, and practical repeat-purchase grocery lines.',
    rootImageTerms: ['market shelf groceries tanzania'],
    leafSlug: 'cooking-oils',
    leafName: 'Cooking Oils',
    leafDescription: 'Refined and blended edible oils for households, restaurants, and resellers.',
    leafImageTerms: ['cooking oil bottle product shelf'],
    attributes: [
      { name: 'volume', displayLabel: 'Volume', type: 'SELECT', options: ['1L', '2L', '5L', '10L'], isRequired: true, placeholder: 'Choose size' },
      { name: 'oil_type', displayLabel: 'Oil Type', type: 'SELECT', options: ['Sunflower', 'Soy', 'Palm Blend', 'Groundnut'], isRequired: true, placeholder: 'Select oil type' },
      { name: 'packaging', displayLabel: 'Packaging', type: 'SELECT', options: ['PET Bottle', 'Jerrycan'], isRequired: true, placeholder: 'Packaging format' },
      { name: 'origin', displayLabel: 'Origin', type: 'TEXT', isRequired: true, placeholder: 'Country or region of origin' },
      { name: 'shelf_life', displayLabel: 'Shelf Life', type: 'TEXT', isRequired: true, placeholder: 'e.g. 12 months' },
    ],
  },
  {
    rootSlug: 'grains-staples',
    rootName: 'Grains & Staples',
    rootDescription: 'Fast-moving rice, flour, and staple packs for household and wholesale trade.',
    rootImageTerms: ['rice sacks grocery store'],
    leafSlug: 'rice-flour',
    leafName: 'Rice & Flour',
    leafDescription: 'Retail and wholesale pack sizes for rice and maize flour.',
    leafImageTerms: ['rice flour packaged product'],
    attributes: [
      { name: 'pack_size', displayLabel: 'Pack Size', type: 'SELECT', options: ['2kg', '5kg', '10kg', '25kg'], isRequired: true, placeholder: 'Pack size' },
      { name: 'variety', displayLabel: 'Variety', type: 'TEXT', isRequired: true, placeholder: 'Rice or flour variety' },
      { name: 'grade', displayLabel: 'Grade', type: 'SELECT', options: ['Premium', 'Standard', 'Wholesale'], isRequired: true, placeholder: 'Product grade' },
      { name: 'origin_region', displayLabel: 'Origin Region', type: 'TEXT', isRequired: true, placeholder: 'Growing or milling region' },
      { name: 'harvest_year', displayLabel: 'Harvest Year', type: 'NUMBER', isRequired: true, placeholder: 'Harvest or milling year' },
    ],
  },
  {
    rootSlug: 'home-appliances',
    rootName: 'Home Appliances',
    rootDescription: 'Kitchen and small home appliances for everyday use and gift-ready retail.',
    rootImageTerms: ['kitchen appliance product display'],
    leafSlug: 'small-kitchen-appliances',
    leafName: 'Small Kitchen Appliances',
    leafDescription: 'Compact kitchen appliances suited for homes, offices, and rental setups.',
    leafImageTerms: ['blender kettle appliance studio'],
    attributes: [
      { name: 'capacity', displayLabel: 'Capacity', type: 'TEXT', isRequired: true, placeholder: 'e.g. 2L' },
      { name: 'power_watts', displayLabel: 'Power (Watts)', type: 'NUMBER', isRequired: true, placeholder: 'e.g. 500' },
      { name: 'voltage', displayLabel: 'Voltage', type: 'TEXT', isRequired: true, placeholder: 'e.g. 220-240V' },
      { name: 'body_material', displayLabel: 'Body Material', type: 'TEXT', isRequired: true, placeholder: 'Main material' },
      { name: 'warranty', displayLabel: 'Warranty', type: 'TEXT', isRequired: true, placeholder: 'Warranty period' },
    ],
  },
  {
    rootSlug: 'fashion-luggage',
    rootName: 'Fashion & Luggage',
    rootDescription: 'Practical lifestyle accessories, school gear, and durable footwear.',
    rootImageTerms: ['bag sneakers retail product'],
    leafSlug: 'bags-footwear',
    leafName: 'Bags & Footwear',
    leafDescription: 'School bags, backpacks, and everyday sneakers with strong repeat demand.',
    leafImageTerms: ['backpack sneakers studio'],
    attributes: [
      { name: 'material', displayLabel: 'Material', type: 'TEXT', isRequired: true, placeholder: 'Main material' },
      { name: 'color', displayLabel: 'Color', type: 'TEXT', isRequired: true, placeholder: 'Main color' },
      { name: 'target_use', displayLabel: 'Target Use', type: 'SELECT', options: ['School', 'Travel', 'Casual', 'Commuter'], isRequired: true, placeholder: 'Primary use' },
      { name: 'size_range', displayLabel: 'Size Range', type: 'TEXT', isRequired: true, placeholder: 'Applicable size range' },
      { name: 'warranty', displayLabel: 'Warranty', type: 'TEXT', isRequired: false, placeholder: 'Warranty details' },
    ],
  },
];

const PRODUCTS: ProductSeed[] = [
  {
    slug: 'azam-sunflower-oil-5l',
    sellerSlug: 'kariakoo-pantry',
    categoryLeafSlug: 'cooking-oils',
    brand: 'Azam',
    productName: 'Sunflower Cooking Oil 5L',
    model: 'AZ-SFO-5L',
    gtin: '06161234567012',
    mpn: 'AZAM-SFO-5L',
    description: 'Azam Sunflower Cooking Oil 5L is a practical fast-moving pantry line for urban households, food vendors, and mini-market restocking. The product is packed in a sturdy PET bottle with a secure cap, pours cleanly during kitchen prep, and suits frying, sauteing, and bulk meal preparation without leaving a heavy aftertaste. Sellers use this pack for weekly repeat orders because the presentation is retail-ready, the shelf appeal is strong, and the size works well for both home and small-business kitchens.',
    shortSeoDescription: 'Retail-ready 5L sunflower cooking oil for shops, homes, and food vendors in Tanzania.',
    generatedDescription: 'A dependable 5L sunflower oil listing optimized for Tanzanian repeat-purchase grocery demand and wholesale restocking.',
    minimumOrderQuantity: 2,
    supplierLocation: 'Kariakoo, Dar es Salaam',
    structuredAttributes: {
      volume: '5L',
      oil_type: 'Sunflower',
      packaging: 'PET Bottle',
      origin: 'Tanzania',
      shelf_life: '12 months',
    },
    seoKeywords: ['sunflower oil 5l', 'cooking oil tanzania', 'azam oil wholesale'],
    paymentOptions: ['COD', 'MOBILE_MONEY', 'CARD'],
    supportsCod: true,
    enablerEnabled: true,
    enablerCommissionRate: 0.09,
    qualityScore: 97,
    imageTerms: ['sunflower cooking oil bottle product', 'sunflower oil shelf grocery', 'cooking oil bottle kitchen counter'],
    imageUrls: [DIRECT_IMAGE_URLS.oilA, DIRECT_IMAGE_URLS.oilB, DIRECT_IMAGE_URLS.oilC],
    variants: [
      {
        name: '5L Retail Bottle',
        skuSuffix: '5L-RTL',
        price: 19800,
        compareAtPrice: 21500,
        costPrice: 16250,
        weightKg: 4.9,
        dimensionsCm: { length: 14, width: 14, height: 31 },
        attributes: { packFormat: 'retail', unitsPerCase: 4, supplierLocation: 'Kariakoo, Dar es Salaam' },
        stock: { warehouseSlug: 'dar-central', quantityAvailable: 240, quantityReserved: 18, quantityDamaged: 3, quantityOnOrder: 60, reorderPoint: 40, maxStock: 520, unitCost: 16250, batchCode: 'AZAM-5L-APR26', locationCode: 'A-05-12' },
      },
    ],
  },
  {
    slug: 'mount-meru-soy-oil-2l',
    sellerSlug: 'kariakoo-pantry',
    categoryLeafSlug: 'cooking-oils',
    brand: 'Mount Meru',
    productName: 'Soy Cooking Oil 2L',
    model: 'MM-SOY-2L',
    gtin: '06161234567029',
    mpn: 'MM-SOY-2L',
    description: 'Mount Meru Soy Cooking Oil 2L gives retailers a balanced mid-size edible oil option that moves quickly with family shoppers and takeaway kitchens. The bottle is easy to shelve, the label reads cleanly in-store, and the size point makes it attractive for repeat basket purchases. This listing includes the core commercial details a seller would normally post, including supplier location, structured specifications, clear search keywords, and delivery/payment metadata for smoother conversion.',
    shortSeoDescription: 'Compact 2L soy cooking oil with strong repeat-buy potential for groceries and mini-markets.',
    generatedDescription: 'Cleanly structured 2L soy cooking oil listing with retail-friendly packaging and clear seller metadata.',
    minimumOrderQuantity: 3,
    supplierLocation: 'Kariakoo, Dar es Salaam',
    structuredAttributes: {
      volume: '2L',
      oil_type: 'Soy',
      packaging: 'PET Bottle',
      origin: 'Tanzania',
      shelf_life: '12 months',
    },
    seoKeywords: ['soy oil 2l tanzania', 'mount meru oil', 'retail cooking oil'],
    paymentOptions: ['COD', 'MOBILE_MONEY'],
    supportsCod: true,
    enablerEnabled: false,
    qualityScore: 95,
    imageTerms: ['soy cooking oil bottle studio', 'soy oil grocery shelf', 'cooking oil product white background'],
    imageUrls: [DIRECT_IMAGE_URLS.oilB, DIRECT_IMAGE_URLS.oilC, DIRECT_IMAGE_URLS.oilA],
    variants: [
      {
        name: '2L Family Bottle',
        skuSuffix: '2L-FAM',
        price: 9800,
        compareAtPrice: 10800,
        costPrice: 7900,
        weightKg: 2.0,
        dimensionsCm: { length: 11, width: 8, height: 26 },
        attributes: { packFormat: 'family', unitsPerCase: 6, supplierLocation: 'Kariakoo, Dar es Salaam' },
        stock: { warehouseSlug: 'dar-central', quantityAvailable: 310, quantityReserved: 22, quantityDamaged: 4, quantityOnOrder: 90, reorderPoint: 55, maxStock: 640, unitCost: 7900, batchCode: 'MM-2L-APR26', locationCode: 'A-03-18' },
      },
    ],
  },
  {
    slug: 'kilombero-premium-rice-5kg',
    sellerSlug: 'kariakoo-pantry',
    categoryLeafSlug: 'rice-flour',
    brand: 'Kilombero Select',
    productName: 'Premium Rice 5kg',
    model: 'KRS-5KG',
    description: 'Kilombero Select Premium Rice 5kg is packed for households and premium grocery shelves that need a polished, aromatic pack with strong repeat demand. The grains cook evenly, the bag stands well for display, and the category fit is easy for search and category merchandising. This listing is seeded with structured product attributes, realistic media references, supplier location, minimum order quantity, and SEO details so the storefront feels complete rather than partially filled.',
    shortSeoDescription: 'Premium 5kg Kilombero rice pack with polished grains and consistent household demand.',
    generatedDescription: 'Search-friendly premium rice listing for Tanzania with complete structured attributes and strong shelf presentation.',
    minimumOrderQuantity: 2,
    supplierLocation: 'Kariakoo, Dar es Salaam',
    structuredAttributes: {
      pack_size: '5kg',
      variety: 'Kilombero aromatic',
      grade: 'Premium',
      origin_region: 'Morogoro',
      harvest_year: '2026',
    },
    seoKeywords: ['kilombero rice 5kg', 'premium rice tanzania', 'aromatic rice retail'],
    paymentOptions: ['COD', 'MOBILE_MONEY', 'CARD'],
    supportsCod: true,
    enablerEnabled: true,
    enablerCommissionRate: 0.08,
    qualityScore: 96,
    imageTerms: ['premium rice bag product', 'rice pack grocery shelf', 'rice packaging kitchen product'],
    imageUrls: [DIRECT_IMAGE_URLS.riceBag, DIRECT_IMAGE_URLS.riceBag, DIRECT_IMAGE_URLS.riceBag],
    variants: [
      {
        name: '5kg Retail Pack',
        skuSuffix: '5KG-RTL',
        price: 17600,
        compareAtPrice: 18900,
        costPrice: 14300,
        weightKg: 5.0,
        dimensionsCm: { length: 17, width: 6, height: 28 },
        attributes: { packFormat: 'retail', grainFinish: 'polished', supplierLocation: 'Kariakoo, Dar es Salaam' },
        stock: { warehouseSlug: 'dar-central', quantityAvailable: 180, quantityReserved: 14, quantityDamaged: 2, quantityOnOrder: 48, reorderPoint: 28, maxStock: 420, unitCost: 14300, batchCode: 'KRS-5KG-APR26', locationCode: 'B-02-07' },
      },
    ],
  },
  {
    slug: 'mbeya-sifa-rice-25kg',
    sellerSlug: 'kariakoo-pantry',
    categoryLeafSlug: 'rice-flour',
    brand: 'Mbeya Sifa',
    productName: 'Rice 25kg Wholesale Sack',
    model: 'MBS-25KG',
    description: 'Mbeya Sifa Rice 25kg Wholesale Sack is positioned for resellers, boarding facilities, and commercial kitchens that buy at heavier pack sizes and need reliable replenishment. The sack format reduces frequent restock friction and the grain profile is suitable for mainstream daily meals. The listing includes wholesale-minded detail such as MOQ, supplier location, logistics notes, and product-level SEO text while keeping the attribute structure clean for the catalog service.',
    shortSeoDescription: '25kg wholesale rice sack for resellers, food service, and institutional kitchens.',
    generatedDescription: 'Wholesale-ready 25kg rice listing designed for high-volume replenishment and straightforward product discovery.',
    minimumOrderQuantity: 1,
    supplierLocation: 'Kariakoo, Dar es Salaam',
    structuredAttributes: {
      pack_size: '25kg',
      variety: 'Long grain',
      grade: 'Wholesale',
      origin_region: 'Mbeya',
      harvest_year: '2026',
    },
    seoKeywords: ['rice 25kg wholesale', 'mbeya rice sack', 'bulk rice tanzania'],
    paymentOptions: ['BANK_TRANSFER', 'MOBILE_MONEY'],
    supportsCod: false,
    enablerEnabled: false,
    qualityScore: 93,
    imageTerms: ['rice sack wholesale warehouse', 'bagged rice market storage', 'rice sack product closeup'],
    imageUrls: [DIRECT_IMAGE_URLS.riceBag, DIRECT_IMAGE_URLS.riceBag, DIRECT_IMAGE_URLS.riceBag],
    variants: [
      {
        name: '25kg Wholesale Sack',
        skuSuffix: '25KG-WHL',
        price: 70500,
        compareAtPrice: 73500,
        costPrice: 62800,
        weightKg: 25.0,
        dimensionsCm: { length: 33, width: 12, height: 60 },
        attributes: { packFormat: 'wholesale', grainFinish: 'long grain', supplierLocation: 'Kariakoo, Dar es Salaam' },
        stock: { warehouseSlug: 'dar-central', quantityAvailable: 95, quantityReserved: 8, quantityDamaged: 1, quantityOnOrder: 22, reorderPoint: 18, maxStock: 220, unitCost: 62800, batchCode: 'MBS-25KG-APR26', locationCode: 'B-05-02' },
      },
    ],
  },
  {
    slug: 'uhuru-sembe-maize-flour-10kg',
    sellerSlug: 'kariakoo-pantry',
    categoryLeafSlug: 'rice-flour',
    brand: 'Uhuru Mills',
    productName: 'Sembe Maize Flour 10kg',
    model: 'UHM-SMB-10',
    description: 'Uhuru Mills Sembe Maize Flour 10kg is a stable high-rotation staple suited for shops, hostel supply, and neighborhood resellers. The pack size is practical for families and food vendors who need value and consistency, while the clean packaging helps shelf recognition in busy outlets. The listing is fully enriched with structured attributes, media URLs, pricing, and supplier metadata so it reads like a genuine seller-posted SKU instead of bare seed data.',
    shortSeoDescription: 'Reliable 10kg sembe flour pack for retailers, hostels, and repeat staple purchases.',
    generatedDescription: 'Detailed sembe flour listing with complete commercial metadata for repeat-demand grocery sales.',
    minimumOrderQuantity: 2,
    supplierLocation: 'Kariakoo, Dar es Salaam',
    structuredAttributes: {
      pack_size: '10kg',
      variety: 'Refined sembe',
      grade: 'Standard',
      origin_region: 'Morogoro',
      harvest_year: '2026',
    },
    seoKeywords: ['sembe flour 10kg', 'maize flour tanzania', 'uhuru mills sembe'],
    paymentOptions: ['COD', 'MOBILE_MONEY'],
    supportsCod: true,
    enablerEnabled: false,
    qualityScore: 94,
    imageTerms: ['maize flour bag product', 'flour pack grocery shelf', 'maize flour package warehouse'],
    imageUrls: [DIRECT_IMAGE_URLS.riceBag, DIRECT_IMAGE_URLS.riceBag, DIRECT_IMAGE_URLS.riceBag],
    variants: [
      {
        name: '10kg Family Pack',
        skuSuffix: '10KG-FAM',
        price: 15800,
        compareAtPrice: 16900,
        costPrice: 12800,
        weightKg: 10.0,
        dimensionsCm: { length: 25, width: 8, height: 42 },
        attributes: { packFormat: 'family', flourTexture: 'fine', supplierLocation: 'Kariakoo, Dar es Salaam' },
        stock: { warehouseSlug: 'dar-central', quantityAvailable: 220, quantityReserved: 15, quantityDamaged: 3, quantityOnOrder: 45, reorderPoint: 35, maxStock: 470, unitCost: 12800, batchCode: 'UHM-10KG-APR26', locationCode: 'B-03-11' },
      },
    ],
  },
  {
    slug: 'sayona-blender-2l',
    sellerSlug: 'arusha-home-tech',
    categoryLeafSlug: 'small-kitchen-appliances',
    brand: 'Sayona',
    productName: 'Blender 2L with Grinder',
    model: 'SBL-4892',
    gtin: '06161234567036',
    mpn: 'SAY-BL-2L',
    description: 'Sayona Blender 2L with Grinder is a practical countertop appliance for juice bars, family kitchens, and furnished apartment setups. It combines a clear jar, simple dial control, and an included dry grinder cup that helps the listing appeal to value-focused shoppers. The seeded catalog entry includes warranty data, wattage, voltage, material information, strong media coverage, and clear delivery/payment metadata so it mirrors a polished live listing.',
    shortSeoDescription: '2L Sayona blender with grinder, clear jar, and everyday kitchen versatility.',
    generatedDescription: 'Complete appliance listing with technical attributes, warranty detail, and sales-ready media coverage.',
    minimumOrderQuantity: 1,
    supplierLocation: 'Kaloleni, Arusha',
    structuredAttributes: {
      capacity: '2L',
      power_watts: '500',
      voltage: '220-240V',
      body_material: 'ABS body with plastic jar',
      warranty: '12 months',
    },
    seoKeywords: ['sayona blender 2l', 'kitchen blender tanzania', 'blender with grinder'],
    paymentOptions: ['CARD', 'MOBILE_MONEY', 'BANK_TRANSFER'],
    supportsCod: false,
    enablerEnabled: true,
    enablerCommissionRate: 0.12,
    qualityScore: 97,
    imageTerms: ['blender product studio kitchen', 'blender countertop appliance', 'blender close up white background'],
    imageUrls: [
      DIRECT_IMAGE_URLS.kitchenAppliances,
      DIRECT_IMAGE_URLS.kitchenAppliances,
      DIRECT_IMAGE_URLS.kitchenAppliances,
    ],
    variants: [
      {
        name: '2L Standard Unit',
        skuSuffix: '2L-STD',
        price: 82000,
        compareAtPrice: 89000,
        costPrice: 67000,
        weightKg: 3.2,
        dimensionsCm: { length: 18, width: 18, height: 40 },
        attributes: { color: 'Black', includedAccessories: ['dry grinder'], supplierLocation: 'Kaloleni, Arusha' },
        stock: { warehouseSlug: 'arusha-regional', quantityAvailable: 42, quantityReserved: 3, quantityDamaged: 1, quantityOnOrder: 12, reorderPoint: 8, maxStock: 95, unitCost: 67000, batchCode: 'SAY-BL-APR26', locationCode: 'C-01-04' },
      },
    ],
  },
  {
    slug: 'decakila-kettle-1-7l',
    sellerSlug: 'arusha-home-tech',
    categoryLeafSlug: 'small-kitchen-appliances',
    brand: 'Decakila',
    productName: 'Electric Kettle 1.7L Stainless Steel',
    model: 'KEKT-001',
    gtin: '06161234567043',
    mpn: 'DK-KTL-17',
    description: 'Decakila Electric Kettle 1.7L Stainless Steel is suited for offices, guest houses, and households that want a quick-heating daily kettle with a cleaner countertop look. The stainless-steel body improves perceived quality, while the capacity and wattage make it a simple comparison item for buyers browsing several kettle options. This seeded product carries the same practical richness a careful seller would submit, from technical specs to searchable title structure and media coverage.',
    shortSeoDescription: '1.7L stainless steel electric kettle for offices, homes, and guest houses.',
    generatedDescription: 'Well-structured electric kettle listing with full technical details, warranty, and search-ready content.',
    minimumOrderQuantity: 1,
    supplierLocation: 'Kaloleni, Arusha',
    structuredAttributes: {
      capacity: '1.7L',
      power_watts: '1500',
      voltage: '220-240V',
      body_material: 'Stainless steel',
      warranty: '6 months',
    },
    seoKeywords: ['electric kettle 1.7l', 'stainless kettle tanzania', 'decakila kettle'],
    paymentOptions: ['COD', 'MOBILE_MONEY', 'CARD'],
    supportsCod: true,
    enablerEnabled: false,
    qualityScore: 95,
    imageTerms: ['electric kettle stainless steel product', 'kettle kitchen appliance studio', 'stainless kettle countertop'],
    imageUrls: [DIRECT_IMAGE_URLS.kettle, DIRECT_IMAGE_URLS.kettle, DIRECT_IMAGE_URLS.kettle],
    variants: [
      {
        name: '1.7L Main Unit',
        skuSuffix: '17L-STD',
        price: 46000,
        compareAtPrice: 49900,
        costPrice: 37200,
        weightKg: 1.4,
        dimensionsCm: { length: 16, width: 16, height: 24 },
        attributes: { color: 'Silver', autoShutOff: true, supplierLocation: 'Kaloleni, Arusha' },
        stock: { warehouseSlug: 'arusha-regional', quantityAvailable: 76, quantityReserved: 5, quantityDamaged: 1, quantityOnOrder: 16, reorderPoint: 12, maxStock: 160, unitCost: 37200, batchCode: 'DK-KTL-APR26', locationCode: 'C-02-09' },
      },
    ],
  },
  {
    slug: 'urban-trek-school-backpack-28l',
    sellerSlug: 'mwanza-style-goods',
    categoryLeafSlug: 'bags-footwear',
    brand: 'Urban Trek',
    productName: 'School Backpack 28L',
    model: 'UT-BAG-28',
    description: 'Urban Trek School Backpack 28L is built for students and daily commuters who want a practical, durable bag with a clean look and enough room for books, a light laptop, lunch, and everyday accessories. The bag profile is slim enough for regular city transport while still offering strong utility for repeat retail demand. This seeded listing is intentionally complete, with material, target use, size range, payment options, descriptive SEO content, and visually realistic product media references.',
    shortSeoDescription: 'Durable 28L school backpack for students and daily commuters.',
    generatedDescription: 'Practical backpack listing with complete seller metadata, search detail, and realistic fashion product media.',
    minimumOrderQuantity: 1,
    supplierLocation: 'Nyakato, Mwanza',
    structuredAttributes: {
      material: 'Water-resistant polyester',
      color: 'Navy blue',
      target_use: 'School',
      size_range: '28L capacity',
      warranty: '3 months stitching warranty',
    },
    seoKeywords: ['school backpack tanzania', 'urban trek bag', 'student backpack 28l'],
    paymentOptions: ['COD', 'MOBILE_MONEY'],
    supportsCod: true,
    enablerEnabled: true,
    enablerCommissionRate: 0.1,
    qualityScore: 96,
    imageTerms: ['school backpack product studio', 'backpack fashion retail shelf', 'backpack close up zipper detail'],
    imageUrls: [
      DIRECT_IMAGE_URLS.backpackBlack,
      DIRECT_IMAGE_URLS.backpackLeather,
      DIRECT_IMAGE_URLS.backpackBlack,
    ],
    variants: [
      {
        name: '28L Navy',
        skuSuffix: '28L-NVY',
        price: 38500,
        compareAtPrice: 42000,
        costPrice: 30500,
        weightKg: 0.9,
        dimensionsCm: { length: 31, width: 15, height: 45 },
        attributes: { color: 'Navy blue', compartments: 4, supplierLocation: 'Nyakato, Mwanza' },
        stock: { warehouseSlug: 'mwanza-store', quantityAvailable: 88, quantityReserved: 6, quantityDamaged: 1, quantityOnOrder: 24, reorderPoint: 14, maxStock: 180, unitCost: 30500, batchCode: 'UT-BAG-APR26', locationCode: 'D-01-05' },
      },
    ],
  },
  {
    slug: 'safaristep-mens-sneakers',
    sellerSlug: 'mwanza-style-goods',
    categoryLeafSlug: 'bags-footwear',
    brand: 'SafariStep',
    productName: 'Men\'s Casual Sneakers',
    model: 'SS-MSN-42',
    description: 'SafariStep Men\'s Casual Sneakers are designed for everyday movement, casual office wear, campus use, and short-distance commuting where buyers want a clean silhouette without moving into premium pricing. The upper and sole balance appearance and durability, making the pair useful for high-turn fashion categories that still need practical value. The seeded listing includes searchable naming, realistic image references, material and use attributes, and clear payment metadata to resemble a proper seller submission.',
    shortSeoDescription: 'Comfortable men\'s casual sneakers for daily wear and commuter use.',
    generatedDescription: 'Fashion-forward everyday sneaker listing with complete structured attributes and retail-ready imagery.',
    minimumOrderQuantity: 1,
    supplierLocation: 'Nyakato, Mwanza',
    structuredAttributes: {
      material: 'Synthetic leather with rubber sole',
      color: 'Black',
      target_use: 'Casual',
      size_range: '40-44',
      warranty: '30-day manufacturing defect cover',
    },
    seoKeywords: ['mens sneakers tanzania', 'casual shoes black', 'safaristep sneakers'],
    paymentOptions: ['COD', 'MOBILE_MONEY', 'CARD'],
    supportsCod: true,
    enablerEnabled: false,
    qualityScore: 95,
    imageTerms: ['mens sneakers product studio', 'black sneakers fashion retail', 'casual shoes close up'],
    imageUrls: [DIRECT_IMAGE_URLS.sneakers, DIRECT_IMAGE_URLS.sneakers, DIRECT_IMAGE_URLS.sneakers],
    variants: [
      {
        name: 'Black Size 42',
        skuSuffix: 'BLK-42',
        price: 54000,
        compareAtPrice: 59000,
        costPrice: 43200,
        weightKg: 0.95,
        dimensionsCm: { length: 32, width: 20, height: 12 },
        attributes: { color: 'Black', size: 42, supplierLocation: 'Nyakato, Mwanza' },
        stock: { warehouseSlug: 'mwanza-store', quantityAvailable: 54, quantityReserved: 4, quantityDamaged: 1, quantityOnOrder: 10, reorderPoint: 9, maxStock: 120, unitCost: 43200, batchCode: 'SS-SNK-APR26', locationCode: 'D-03-02' },
      },
    ],
  },
];

const slugify = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['"]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const normalizeDatabaseUrl = (value: string | undefined): string | undefined => {
  if (!value) return value;

  try {
    const parsed = new URL(value);
    const isLocal = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
    if (!parsed.searchParams.has('sslmode')) {
      parsed.searchParams.set('sslmode', isLocal ? 'disable' : 'require');
    }
    return parsed.toString();
  } catch {
    return value;
  }
};

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const toCrockford26 = (value: string): string => {
  const bytes = crypto.createHash('sha256').update(value).digest();
  let bigint = BigInt(`0x${bytes.toString('hex')}`);
  let output = '';
  while (output.length < 26) {
    output = CROCKFORD[Number(bigint % 32n)] + output;
    bigint /= 32n;
  }
  return output;
};

const makeSeedId = (prefix: string, value: string): string => `${prefix}_${toCrockford26(`${prefix}:${value}`)}`;
const makeUuid = (prefix: string, value: string): string => {
  const hex = crypto.createHash('sha256').update(`${prefix}:${value}`).digest('hex').slice(0, 32);
  const part3 = `4${hex.slice(13, 16)}`;
  const variantNibble = ((parseInt(hex.slice(16, 17), 16) & 0x3) | 0x8).toString(16);
  const part4 = `${variantNibble}${hex.slice(17, 20)}`;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${part3}-${part4}-${hex.slice(20, 32)}`;
};
const hashText = (value: string, length = 32): string => crypto.createHash('sha256').update(value).digest('hex').slice(0, length);
const money = (value: number): Prisma.Decimal => new Prisma.Decimal(value.toFixed(2));
const now = (): Date => new Date();

const buildImageUrl = (terms: string, slot: number): string =>
  `https://source.unsplash.com/featured/1600x1200/?${encodeURIComponent(terms)}&sig=${slot}`;

const buildMediaUrls = (terms: string[]): string[] =>
  terms.map((term, index) => buildImageUrl(term, index + 1));

const hashIndex = (value: string): string =>
  crypto.createHmac('sha256', USER_INDEX_SECRET).update(value).digest('hex');

const countTable = async (prisma: PrismaClient, tableName: string): Promise<number> => {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint | number | string }>>(
    `SELECT COUNT(*)::bigint AS count FROM "${tableName}"`
  );
  const value = rows[0]?.count ?? 0;
  return Number(value);
};

const deleteTableIfExists = async (
  tx: Prisma.TransactionClient,
  tableName: string,
  where?: string
): Promise<void> => {
  const rows = await tx.$queryRawUnsafe<Array<{ oid: string | null }>>(
    `SELECT to_regclass('public."${tableName}"')::text AS oid`
  );
  if (!rows[0]?.oid) {
    return;
  }

  const statement = where
    ? `DELETE FROM "${tableName}" WHERE ${where}`
    : `DELETE FROM "${tableName}"`;
  await tx.$executeRawUnsafe(statement);
};

const cleanupStatements: ReadonlyArray<{ table: string; where?: string }> = [
  { table: 'checkout_inventory_reservations' },
  { table: 'checkout_cart_items' },
  { table: 'campaign_products' },
  { table: 'campaign_categories' },
  { table: 'enabler_product_listings' },
  { table: 'analytics_seller_product_performance' },
  { table: 'analytics_seller_inventory_health' },
  { table: 'analytics_seller_action_items', where: '"productId" IS NOT NULL' },
  { table: 'inventory_reservations' },
  { table: 'inventory_movements' },
  { table: 'inventory_count_items' },
  { table: 'inventory_counts' },
  { table: 'inventory_stock_items' },
  { table: 'catalog_media_refs' },
  { table: 'catalog_product_attributes' },
  { table: 'catalog_buy_box_alternatives' },
  { table: 'catalog_buy_boxes' },
  { table: 'catalog_product_match_audits' },
  { table: 'catalog_match_confirmations' },
  { table: 'catalog_outbox_events' },
  { table: 'catalog_product_variants' },
  { table: 'catalog_category_attributes' },
  { table: 'catalog_products' },
  { table: 'catalog_categories' },
  { table: 'inventory_warehouses' },
];

const main = async (): Promise<void> => {
  const confirm = String(process.env.CATALOG_RESET_CONFIRM || '').trim();
  const dryRun = process.argv.includes('--dry-run');
  const normalizedDatabaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL);

  if (!normalizedDatabaseUrl) {
    throw new Error('DATABASE_URL or DATABASE_PUBLIC_URL is required.');
  }
  if (!dryRun && confirm !== RESET_CONFIRM_TOKEN) {
    throw new Error(`Refusing to reset catalog without CATALOG_RESET_CONFIRM=${RESET_CONFIRM_TOKEN}.`);
  }

  process.env.DATABASE_URL = normalizedDatabaseUrl;

  const sellerPasswordHash = bcrypt.hashSync(DEFAULT_SELLER_PASSWORD, 10);
  const prisma = new PrismaClient();

  const tableSnapshot = async (): Promise<Record<string, number>> => ({
    categories: await countTable(prisma, 'catalog_categories'),
    categoryAttributes: await countTable(prisma, 'catalog_category_attributes'),
    products: await countTable(prisma, 'catalog_products'),
    productAttributes: await countTable(prisma, 'catalog_product_attributes'),
    variants: await countTable(prisma, 'catalog_product_variants'),
    mediaRefs: await countTable(prisma, 'catalog_media_refs'),
    stockItems: await countTable(prisma, 'inventory_stock_items'),
    warehouses: await countTable(prisma, 'inventory_warehouses'),
  });

  const planned = {
    sellers: SELLERS.length,
    categoryRoots: new Set(CATEGORIES.map((category) => category.rootSlug)).size,
    categoryLeaves: CATEGORIES.length,
    categoryAttributes: CATEGORIES.reduce((sum, category) => sum + category.attributes.length, 0),
    products: PRODUCTS.length,
    variants: PRODUCTS.reduce((sum, product) => sum + product.variants.length, 0),
    mediaRefs: PRODUCTS.length * 3,
    stockItems: PRODUCTS.reduce((sum, product) => sum + product.variants.length, 0),
    codEnabledSellers: SELLERS.filter((seller) => seller.codEnabled).length,
    codSupportedProducts: PRODUCTS.filter((product) => product.supportsCod).length,
  };

  if (dryRun) {
    console.log('[catalog-seed] dry run');
    console.log(JSON.stringify({ planned }, null, 2));
    await prisma.$disconnect();
    return;
  }

  const before = await tableSnapshot();

  const categoryRootIdBySlug = new Map<string, string>();
  const categoryLeafIdBySlug = new Map<string, string>();
  const categoryAttributeIdByKey = new Map<string, string>();
  const warehouseIdBySlug = new Map<string, string>();
  const sellerIdBySlug = new Map<string, string>();
  const catalogSellerUuidBySlug = new Map<string, string>();

  await prisma.$transaction(async (tx) => {
    for (const statement of cleanupStatements) {
      await deleteTableIfExists(tx, statement.table, statement.where);
    }

    for (const warehouse of WAREHOUSES) {
      const warehouseId = makeUuid('wh', warehouse.slug);
      warehouseIdBySlug.set(warehouse.slug, warehouseId);
      await tx.inventory_Warehouse.create({
        data: {
          id: warehouseId,
          code: warehouse.code,
          name: warehouse.name,
          type: warehouse.type,
          status: 'active',
          address: {
            street: warehouse.street,
            city: warehouse.city,
            region: warehouse.region,
            postalCode: warehouse.postalCode,
            country: 'Tanzania',
          },
          capacity: {
            unit: 'units',
            total: warehouse.capacityUnits,
            reservedBuffer: Math.round(warehouse.capacityUnits * 0.12),
          },
          operatingHours: {
            timezone: 'Africa/Dar_es_Salaam',
            weekdays: '08:00-18:00',
            saturday: '09:00-14:00',
          },
        },
      });
    }

    for (const seller of SELLERS) {
      const sellerId = makeSeedId('usr', seller.email);
      const catalogSellerUuid = makeUuid('slr', seller.email);
      sellerIdBySlug.set(seller.slug, sellerId);
      catalogSellerUuidBySlug.set(seller.slug, catalogSellerUuid);

      await tx.user.upsert({
        where: { email: seller.email },
        update: {
          id: sellerId,
          publicCode: seller.publicCode,
          email: seller.email,
          passwordHash: sellerPasswordHash,
          role: 'SELLER',
          status: 'ACTIVE',
          phoneNumber: seller.phoneNumber,
          isEmailVerified: true,
          isPhoneVerified: true,
          twoFactorEnabled: false,
          twoFactorSecret: null,
        },
        create: {
          id: sellerId,
          publicCode: seller.publicCode,
          email: seller.email,
          passwordHash: sellerPasswordHash,
          role: 'SELLER',
          status: 'ACTIVE',
          phoneNumber: seller.phoneNumber,
          isEmailVerified: true,
          isPhoneVerified: true,
          twoFactorEnabled: false,
        },
      });

      await tx.auth_User.upsert({
        where: { email: seller.email },
        update: {
          id: sellerId,
          publicCode: seller.publicCode,
          email: seller.email,
          passwordHash: sellerPasswordHash,
          role: 'SELLER',
          status: 'ACTIVE',
          twoFactorEnabled: false,
          twoFactorSecret: null,
        },
        create: {
          id: sellerId,
          publicCode: seller.publicCode,
          email: seller.email,
          passwordHash: sellerPasswordHash,
          role: 'SELLER',
          status: 'ACTIVE',
          twoFactorEnabled: false,
        },
      });

      await tx.user_User.upsert({
        where: { email: seller.email },
        update: {
          id: sellerId,
          publicCode: seller.publicCode,
          email: seller.email,
          passwordHash: sellerPasswordHash,
          role: 'SELLER',
          status: 'ACTIVE',
          firstName: seller.firstName,
          lastName: seller.lastName,
          phoneNumber: seller.phoneNumber,
          isEmailVerified: true,
          isPhoneVerified: true,
          emailVerifiedAt: now(),
          phoneVerifiedAt: now(),
          language: 'en',
          timezone: 'Africa/Dar_es_Salaam',
          notificationsEnabled: true,
          codEnabled: seller.codEnabled,
          codReputationScore: seller.codEnabled ? 85 : 0,
          codSuccessfulOrders: seller.codEnabled ? 12 : 0,
          codFailedOrders: seller.codEnabled ? 1 : 0,
          codTotalOrders: seller.codEnabled ? 13 : 0,
          codPermanentlyDisabled: false,
          kycStatus: 'VERIFIED',
          kycLevel: 3,
          kycSubmittedAt: now(),
          kycVerifiedAt: now(),
          attributes: {
            sellerProfile: {
              businessName: seller.businessName,
              supplierLocation: `${seller.city}, ${seller.region}`,
              codDailyLimit: seller.codDailyLimit,
              leadTimeLabel: seller.leadTimeLabel,
              catalogSellerId: catalogSellerUuid,
            },
            seedMarker: 'catalog-reset-seed',
          },
        },
        create: {
          id: sellerId,
          publicCode: seller.publicCode,
          email: seller.email,
          passwordHash: sellerPasswordHash,
          role: 'SELLER',
          status: 'ACTIVE',
          firstName: seller.firstName,
          lastName: seller.lastName,
          phoneNumber: seller.phoneNumber,
          isEmailVerified: true,
          isPhoneVerified: true,
          emailVerifiedAt: now(),
          phoneVerifiedAt: now(),
          language: 'en',
          timezone: 'Africa/Dar_es_Salaam',
          notificationsEnabled: true,
          codEnabled: seller.codEnabled,
          codReputationScore: seller.codEnabled ? 85 : 0,
          codSuccessfulOrders: seller.codEnabled ? 12 : 0,
          codFailedOrders: seller.codEnabled ? 1 : 0,
          codTotalOrders: seller.codEnabled ? 13 : 0,
          codPermanentlyDisabled: false,
          kycStatus: 'VERIFIED',
          kycLevel: 3,
          kycSubmittedAt: now(),
          kycVerifiedAt: now(),
          attributes: {
            sellerProfile: {
              businessName: seller.businessName,
              supplierLocation: `${seller.city}, ${seller.region}`,
              codDailyLimit: seller.codDailyLimit,
              leadTimeLabel: seller.leadTimeLabel,
              catalogSellerId: catalogSellerUuid,
            },
            seedMarker: 'catalog-reset-seed',
          },
        },
      });

      await tx.auth_UserIndex.upsert({
        where: { userId_indexType: { userId: sellerId, indexType: 'email' } },
        update: { value: seller.email },
        create: { userId: sellerId, indexType: 'email', value: seller.email },
      });
      await tx.auth_UserIndex.upsert({
        where: { userId_indexType: { userId: sellerId, indexType: 'phone' } },
        update: { value: seller.phoneNumber },
        create: { userId: sellerId, indexType: 'phone', value: seller.phoneNumber },
      });
      await tx.auth_UserIndex.upsert({
        where: { userId_indexType: { userId: sellerId, indexType: 'publicCode' } },
        update: { value: seller.publicCode },
        create: { userId: sellerId, indexType: 'publicCode', value: seller.publicCode },
      });

      await tx.user_UserIndex.upsert({
        where: { userId_indexType: { userId: sellerId, indexType: 'email' } },
        update: { value: hashIndex(seller.email) },
        create: { userId: sellerId, indexType: 'email', value: hashIndex(seller.email) },
      });
      await tx.user_UserIndex.upsert({
        where: { userId_indexType: { userId: sellerId, indexType: 'phone' } },
        update: { value: hashIndex(seller.phoneNumber) },
        create: { userId: sellerId, indexType: 'phone', value: hashIndex(seller.phoneNumber) },
      });

      await tx.user_UserAddress.upsert({
        where: { id: makeSeedId('uad', seller.email) },
        update: {
          userId: sellerId,
          type: 'WORK',
          street: seller.street,
          city: seller.city,
          state: seller.region,
          postalCode: seller.postalCode,
          country: 'Tanzania',
          isDefault: true,
        },
        create: {
          id: makeSeedId('uad', seller.email),
          userId: sellerId,
          type: 'WORK',
          street: seller.street,
          city: seller.city,
          state: seller.region,
          postalCode: seller.postalCode,
          country: 'Tanzania',
          isDefault: true,
        },
      });

      const businessId = makeSeedId('biz', seller.businessName);
      await tx.business.upsert({
        where: { registrationNumber: seller.registrationNumber },
        update: {
          id: businessId,
          name: seller.businessName,
          businessType: 'SOLE_PROPRIETORSHIP',
          taxId: seller.taxId,
          status: 'ACTIVE',
          verificationStatus: 'VERIFIED',
          complianceStatus: 'COMPLIANT',
          ownerId: sellerId,
          description: seller.description,
          industry: seller.industries,
          website: seller.website,
          email: seller.email,
          phoneNumber: seller.phoneNumber,
          verifiedAt: now(),
          verifiedBy: 'catalog-seed-script',
          attributes: {
            seedMarker: 'catalog-reset-seed',
            codEnabled: seller.codEnabled,
            codDailyLimit: seller.codDailyLimit,
            catalogSellerId: catalogSellerUuid,
          },
        },
        create: {
          id: businessId,
          name: seller.businessName,
          businessType: 'SOLE_PROPRIETORSHIP',
          registrationNumber: seller.registrationNumber,
          taxId: seller.taxId,
          status: 'ACTIVE',
          verificationStatus: 'VERIFIED',
          complianceStatus: 'COMPLIANT',
          ownerId: sellerId,
          description: seller.description,
          industry: seller.industries,
          website: seller.website,
          email: seller.email,
          phoneNumber: seller.phoneNumber,
          verifiedAt: now(),
          verifiedBy: 'catalog-seed-script',
          attributes: {
            seedMarker: 'catalog-reset-seed',
            codEnabled: seller.codEnabled,
            codDailyLimit: seller.codDailyLimit,
            catalogSellerId: catalogSellerUuid,
          },
        },
      });

      await tx.businessAddress.upsert({
        where: { id: makeSeedId('bad', seller.businessName) },
        update: {
          businessId,
          type: 'MAIN',
          street: seller.street,
          city: seller.city,
          region: seller.region,
          postalCode: seller.postalCode,
          country: 'Tanzania',
          isPrimary: true,
        },
        create: {
          id: makeSeedId('bad', seller.businessName),
          businessId,
          type: 'MAIN',
          street: seller.street,
          city: seller.city,
          region: seller.region,
          postalCode: seller.postalCode,
          country: 'Tanzania',
          isPrimary: true,
        },
      });
    }

    for (const category of CATEGORIES) {
      const rootId = categoryRootIdBySlug.get(category.rootSlug) || makeUuid('cat', category.rootSlug);
      if (!categoryRootIdBySlug.has(category.rootSlug)) {
        categoryRootIdBySlug.set(category.rootSlug, rootId);
        await tx.category.create({
          data: {
            id: rootId,
            parentId: null,
            name: category.rootName,
            slug: category.rootSlug,
            description: category.rootDescription,
            imageUrl: buildImageUrl(category.rootImageTerms[0], 1),
            displayOrder: categoryRootIdBySlug.size * 100,
            isActive: true,
            seoMetadata: {
              seedMarker: 'catalog-reset-seed',
              level: 'root',
            },
          },
        });
      }

      const leafId = makeUuid('cat', category.leafSlug);
      categoryLeafIdBySlug.set(category.leafSlug, leafId);
      await tx.category.create({
        data: {
          id: leafId,
          parentId: rootId,
          name: category.leafName,
          slug: category.leafSlug,
          description: category.leafDescription,
          imageUrl: buildImageUrl(category.leafImageTerms[0], 2),
          displayOrder: categoryRootIdBySlug.size * 100 + 1,
          isActive: true,
          seoMetadata: {
            seedMarker: 'catalog-reset-seed',
            level: 'leaf',
          },
        },
      });

      for (const [index, attribute] of category.attributes.entries()) {
        const attributeId = makeUuid('atr', `${category.leafSlug}:${attribute.name}`);
        categoryAttributeIdByKey.set(`${category.leafSlug}:${attribute.name}`, attributeId);
        await tx.categoryAttribute.create({
          data: {
            id: attributeId,
            categoryId: leafId,
            name: attribute.name,
            displayLabel: attribute.displayLabel,
            type: attribute.type,
            options: attribute.options ?? Prisma.JsonNull,
            isRequired: attribute.isRequired ?? false,
            displayOrder: index,
            placeholder: attribute.placeholder ?? null,
          },
        });
      }
    }

    for (const product of PRODUCTS) {
      const sellerId = catalogSellerUuidBySlug.get(product.sellerSlug);
      const categoryId = categoryLeafIdBySlug.get(product.categoryLeafSlug);
      if (!sellerId || !categoryId) {
        throw new Error(`Missing seller or category for product ${product.slug}`);
      }

      const productId = makeUuid('prd', product.slug);
      const mediaUrls = product.imageUrls ?? buildMediaUrls(product.imageTerms);

      await tx.product.create({
        data: {
          id: productId,
          sellerId,
          title: `${product.brand} ${product.productName}`,
          description: product.description,
          categoryId,
          brand: product.brand,
          model: product.model ?? null,
          status: 'published',
          visibility: 'public',
          seoMetadata: {
            currency: CURRENCY,
            supplierLocation: product.supplierLocation,
            minimumOrderQuantity: product.minimumOrderQuantity,
            paymentOptions: product.paymentOptions,
            supportsCod: product.supportsCod,
            mediaUrls,
            seedMarker: 'catalog-reset-seed',
          },
          tags: Array.from(new Set([
            ...product.seoKeywords,
            slugify(product.brand),
            slugify(product.productName),
            product.supportsCod ? 'cod-available' : 'cod-disabled',
          ])),
          gtin: product.gtin ?? null,
          mpn: product.mpn ?? null,
          isbn: null,
          fingerprint: hashText(`${categoryId}:${product.brand}:${product.productName}`, 32),
          fingerprintVersion: 1,
          slug: product.slug,
          seoTitle: `${product.brand} ${product.productName} in Tanzania`,
          shortSeoDescription: product.shortSeoDescription,
          generatedDescription: product.generatedDescription,
          qualityScore: product.qualityScore,
          enablerEnabled: product.enablerEnabled,
          enablerCommissionRate: product.enablerCommissionRate !== undefined
            ? new Prisma.Decimal(product.enablerCommissionRate.toFixed(4))
            : null,
        },
      });

      for (const [attributeName, value] of Object.entries(product.structuredAttributes)) {
        const attributeId = categoryAttributeIdByKey.get(`${product.categoryLeafSlug}:${attributeName}`);
        if (!attributeId) {
          throw new Error(`Missing category attribute ${attributeName} for ${product.categoryLeafSlug}`);
        }
        await tx.productAttribute.create({
          data: {
            id: makeUuid('pat', `${product.slug}:${attributeName}`),
            productId,
            attributeId,
            value,
          },
        });
      }

      for (const [index, url] of mediaUrls.entries()) {
        await tx.mediaRef.create({
          data: {
            id: makeUuid('med', `${product.slug}:${index + 1}`),
            entityType: 'product',
            entityId: productId,
            mediaType: 'image',
            url,
            altText: `${product.brand} ${product.productName} image ${index + 1}`,
            displayOrder: index,
            isPrimary: index === 0,
            metadata: {
              seedMarker: 'catalog-reset-seed',
              slot: index + 1,
              query: product.imageTerms[index],
            },
            uploadedBy: sellerId,
          },
        });
      }

      for (const variant of product.variants) {
        const variantId = makeUuid('prv', `${product.slug}:${variant.skuSuffix}`);
        const warehouseId = warehouseIdBySlug.get(variant.stock.warehouseSlug);
        if (!warehouseId) {
          throw new Error(`Missing warehouse ${variant.stock.warehouseSlug}`);
        }

        await tx.productVariant.create({
          data: {
            id: variantId,
            productId,
            sku: `${slugify(product.brand).slice(0, 4).toUpperCase()}-${variant.skuSuffix}`,
            name: variant.name,
            price: money(variant.price),
            compareAtPrice: variant.compareAtPrice ? money(variant.compareAtPrice) : null,
            costPrice: money(variant.costPrice),
            inventoryPolicy: 'deny',
            weight: variant.weightKg !== undefined ? new Prisma.Decimal(variant.weightKg.toFixed(3)) : null,
            dimensions: {
              unit: 'cm',
              ...variant.dimensionsCm,
            },
            attributes: {
              ...variant.attributes,
              currency: CURRENCY,
              paymentOptions: product.paymentOptions,
              supportsCod: product.supportsCod,
              minimumOrderQuantity: product.minimumOrderQuantity,
            },
            images: mediaUrls,
            status: 'active',
          },
        });

        await tx.inventory_StockItem.create({
          data: {
            id: makeUuid('stk', `${product.slug}:${variant.skuSuffix}`),
            productVariantId: variantId,
            warehouseId,
            sku: `${slugify(product.brand).slice(0, 4).toUpperCase()}-${variant.skuSuffix}`,
            quantityAvailable: variant.stock.quantityAvailable,
            quantityReserved: variant.stock.quantityReserved,
            quantityDamaged: variant.stock.quantityDamaged,
            quantityOnOrder: variant.stock.quantityOnOrder,
            reorderPoint: variant.stock.reorderPoint,
            maxStock: variant.stock.maxStock,
            unitCost: money(variant.stock.unitCost),
            lastInventoryCount: now(),
            expiryDate: null,
            batchNumber: variant.stock.batchCode,
            locationCode: variant.stock.locationCode,
            status: 'active',
            metadata: {
              seedMarker: 'catalog-reset-seed',
              sellerSlug: product.sellerSlug,
            },
          },
        });
      }
    }
  }, { maxWait: 180000, timeout: 180000 });

  const after = await tableSnapshot();

  console.log('[catalog-seed] completed');
  console.log(JSON.stringify({ before, planned, after }, null, 2));
  await prisma.$disconnect();
};

void main().catch(async (error: unknown) => {
  console.error('[catalog-seed] failed');
  console.error(error);
  process.exit(1);
});
