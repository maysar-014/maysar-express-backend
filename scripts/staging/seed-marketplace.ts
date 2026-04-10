import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { Prisma, PrismaClient } from '@prisma/client';
import { makeId } from '../../shared/ids/id';

const SEED_MARKER = 'maysar-staging-training';
const PRODUCT_SLUG_PREFIX = 'maysar-tz-';
const SKU_PREFIX = 'MYS-TZ-';
const MEDIA_ALT_PREFIX = 'MAYSAR-TZ-SEED|';
const BUSINESS_FILE_PREFIX = 'MAYSAR-TZ-BIZ|';
const PASSWORD_HASH_ROUNDS = 10;
const DEFAULT_SELLER_PASSWORD = process.env.SEED_SELLER_PASSWORD || 'MaysarSeller#2026!';

type SeedPersonRole = 'SYSTEM' | 'SELLER';

type PersonSeed = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  publicCode: string;
  phoneNumber: string;
  role: SeedPersonRole;
  status: 'ACTIVE';
  passwordHash: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  emailVerifiedAt: Date;
  phoneVerifiedAt: Date;
  timezone: string;
  language: string;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  twoFactorMethod: string | null;
  twoFactorBackupCodes: string[];
  city: string;
  region: string;
  street: string;
  postalCode: string;
  country: string;
  kycDocuments: Array<Record<string, unknown>>;
  kycVerifiedByEmail: string;
  attributes: Record<string, unknown>;
};

type SellerBusinessSeed = {
  ownerEmail: string;
  name: string;
  businessType: 'SOLE_PROPRIETORSHIP' | 'PARTNERSHIP' | 'LIMITED_LIABILITY' | 'CORPORATION';
  registrationNumber: string;
  taxId: string;
  description: string;
  industries: string[];
  website: string;
  email: string;
  phoneNumber: string;
  city: string;
  region: string;
  street: string;
  postalCode: string;
  complianceNotes: string;
  attributes: Record<string, unknown>;
};

type WarehouseSeed = {
  id: string;
  code: string;
  name: string;
  type: 'central' | 'regional' | 'store';
  address: Record<string, unknown>;
  capacity: Record<string, unknown>;
  operatingHours: Record<string, unknown>;
};

type FamilySeed = {
  name: string;
  slug: string;
  description: string;
  imageTokens: string[];
};

type GroupSeed = {
  key: string;
  name: string;
  slug: string;
  description: string;
  imageTokens: string[];
  brands: string[];
  labels: string[];
  priceBase: number;
  priceStep: number;
  stockBase: number;
  stockStep: number;
  sellerIndex: number;
  families: FamilySeed[];
};

type CategoryRow = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  displayOrder: number;
  isActive: boolean;
  seoMetadata: Record<string, unknown>;
};

type ProductRow = {
  id: string;
  sellerId: string;
  title: string;
  description: string | null;
  categoryId: string;
  brand: string | null;
  model: string | null;
  status: 'published';
  visibility: 'public';
  seoMetadata: Record<string, unknown>;
  tags: string[];
  gtin: string | null;
  mpn: string | null;
  isbn: string | null;
  fingerprint: string;
  fingerprintVersion: number;
  slug: string;
  seoTitle: string | null;
  shortSeoDescription: string | null;
  generatedDescription: string | null;
  qualityScore: number;
  enablerEnabled: boolean;
  enablerCommissionRate: Prisma.Decimal | null;
};

type VariantRow = {
  id: string;
  productId: string;
  sku: string;
  name: string | null;
  price: Prisma.Decimal;
  compareAtPrice: Prisma.Decimal | null;
  costPrice: Prisma.Decimal | null;
  inventoryPolicy: 'deny';
  weight: Prisma.Decimal | null;
  dimensions: Record<string, unknown> | null;
  attributes: Record<string, unknown> | null;
  images: string[] | null;
  status: 'active';
};

type MediaRow = {
  id: string;
  entityType: 'product';
  entityId: string;
  mediaType: 'image';
  url: string;
  altText: string;
  displayOrder: number;
  isPrimary: boolean;
  metadata: Record<string, unknown>;
  uploadedBy: string;
};

type StockRow = {
  id: string;
  productVariantId: string;
  warehouseId: string;
  sku: string;
  quantityAvailable: number;
  quantityReserved: number;
  quantityDamaged: number;
  quantityOnOrder: number;
  reorderPoint: number;
  maxStock: number;
  unitCost: Prisma.Decimal;
  lastInventoryCount: Date;
  expiryDate: Date | null;
  batchNumber: string;
  locationCode: string;
  status: 'active';
  metadata: Record<string, unknown>;
};

type BusinessRow = {
  id: string;
  ownerId: string;
  name: string;
  businessType: SellerBusinessSeed['businessType'];
  registrationNumber: string;
  taxId: string;
  status: 'ACTIVE';
  verificationStatus: 'VERIFIED';
  complianceStatus: 'COMPLIANT';
  description: string;
  industry: string[];
  website: string;
  email: string;
  phoneNumber: string;
  verifiedAt: Date;
  verifiedBy: string;
  attributes: Record<string, unknown>;
};

type BusinessAddressRow = {
  id: string;
  businessId: string;
  type: 'MAIN';
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  isPrimary: boolean;
};

type BusinessDocumentRow = {
  id: string;
  businessId: string;
  type: 'REGISTRATION_CERTIFICATE' | 'TAX_CERTIFICATE' | 'BUSINESS_LICENSE';
  fileName: string;
  fileUrl: string;
  status: 'APPROVED';
  uploadedAt: Date;
  verifiedAt: Date;
};

type BusinessComplianceRow = {
  id: string;
  businessId: string;
  type: 'TAX_COMPLIANCE' | 'BUSINESS_LICENSE';
  status: 'COMPLIANT';
  checkedAt: Date;
  expiresAt: Date;
  notes: string;
};

type KycRow = {
  id: string;
  userId: string;
  verificationStatus: 'approved';
  submittedAt: Date;
  verifiedAt: Date;
  verifiedBy: string;
  documents: Array<Record<string, unknown>>;
  rejectionReason: string | null;
  expiryDate: Date;
  riskLevel: 'low';
};

type UserAddressRow = {
  id: string;
  userId: string;
  type: 'HOME' | 'WORK';
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

type TwoFactorRow = {
  id: string;
  userId: string;
  method: string;
  secret: string;
  backupCodes: string[];
  isEnabled: boolean;
  isVerified: boolean;
  deviceName: string;
  lastUsedAt: Date | null;
};

type SeedPlan = {
  people: PersonSeed[];
  warehouses: WarehouseSeed[];
  categories: CategoryRow[];
  products: ProductRow[];
  variants: VariantRow[];
  mediaRefs: MediaRow[];
  stockItems: StockRow[];
  businesses: BusinessRow[];
  businessAddresses: BusinessAddressRow[];
  businessDocuments: BusinessDocumentRow[];
  businessComplianceRecords: BusinessComplianceRow[];
  kycRecords: KycRow[];
  userAddresses: UserAddressRow[];
  twoFactorRecords: TwoFactorRow[];
  counts: Record<string, number>;
};

const isTruthy = (value: unknown): boolean =>
  ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());

const normalizeDatabaseUrl = (value: string | undefined): string | undefined => {
  if (!value) {
    return value;
  }

  try {
    const parsed = new URL(value);
    const isLocal = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
    if (isLocal && !parsed.searchParams.has('sslmode')) {
      parsed.searchParams.set('sslmode', 'disable');
    }
    return parsed.toString();
  } catch {
    return value;
  }
};

const slugify = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['"]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const compactCode = (value: string, length = 5): string =>
  slugify(value).replace(/-/g, '').toUpperCase().slice(0, length).padEnd(length, 'X');

const shortHash = (value: string, length = 8): string =>
  crypto.createHash('sha1').update(value).digest('hex').slice(0, length).toUpperCase();

const money = (value: number): Prisma.Decimal => new Prisma.Decimal(value.toFixed(2));
const decimal3 = (value: number): Prisma.Decimal => new Prisma.Decimal(value.toFixed(3));
const now = (): Date => new Date();
const futureDate = (days: number): Date => new Date(Date.now() + days * 24 * 60 * 60 * 1000);
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const splitTokens = (...values: string[]): string[] =>
  values
    .flatMap((value) => value.split(/[^a-zA-Z0-9]+/g))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

const buildImageUrl = (provider: 'unsplash' | 'loremflickr', tokens: string[], seed: string): string => {
  const query = tokens.map((token) => slugify(token).replace(/-/g, '')).filter(Boolean).join(',');
  if (provider === 'unsplash') {
    return `https://source.unsplash.com/featured/1600x1200/?${encodeURI(query)}`;
  }
  return `https://loremflickr.com/1600/1200/${encodeURI(query)}?lock=${encodeURIComponent(seed)}`;
};

const buildImageTokens = (...parts: string[]): string[] => splitTokens(...parts);

const parseWeight = (label: string): Prisma.Decimal | null => {
  const normalized = label.trim().toLowerCase();
  if (/^\d+(\.\d+)?kg$/.test(normalized)) {
    return decimal3(Number.parseFloat(normalized.replace('kg', '')));
  }
  if (/^\d+(\.\d+)?g$/.test(normalized)) {
    return decimal3(Number.parseFloat(normalized.replace('g', '')) / 1000);
  }
  if (/^\d+(\.\d+)?ml$/.test(normalized)) {
    return decimal3(Number.parseFloat(normalized.replace('ml', '')) / 1000);
  }
  if (/^\d+(\.\d+)?l$/.test(normalized)) {
    return decimal3(Number.parseFloat(normalized.replace('l', '')));
  }
  if (normalized.includes('pair')) {
    return decimal3(0.5);
  }
  if (normalized.includes('set')) {
    return decimal3(1);
  }
  if (normalized.includes('bundle')) {
    return decimal3(1.2);
  }
  return null;
};

const buildKycDocuments = (subject: string, email: string, city: string): Array<Record<string, unknown>> => [
  {
    type: 'national_id',
    url: `https://documents.maysar.co.tz/kyc/${slugify(email)}/national-id.pdf`,
    fileName: `${slugify(subject)}-national-id.pdf`,
    mimeType: 'application/pdf',
    fileSizeBytes: 184320,
    storageProvider: 'maysar-docs',
    storageKey: `${slugify(email)}/national-id.pdf`,
    checksumSha256: shortHash(`${email}:national-id`, 32),
    uploadedAt: now().toISOString(),
    status: 'approved',
    city
  },
  {
    type: 'proof_of_address',
    url: `https://documents.maysar.co.tz/kyc/${slugify(email)}/proof-of-address.pdf`,
    fileName: `${slugify(subject)}-proof-of-address.pdf`,
    mimeType: 'application/pdf',
    fileSizeBytes: 122880,
    storageProvider: 'maysar-docs',
    storageKey: `${slugify(email)}/proof-of-address.pdf`,
    checksumSha256: shortHash(`${email}:proof-of-address`, 32),
    uploadedAt: now().toISOString(),
    status: 'approved',
    city
  }
];

type TrainingRole = 'buyer' | 'seller' | 'supplier' | 'courier' | 'enabler' | 'system';
type TrainingStatusValue = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
type TrainingDifficultyValue = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

type MarkdownSection = {
  heading: string;
  bullets: string[];
  note?: string;
};

type TrainingModuleSeed = {
  slug: string;
  name: string;
  description: string;
  category: string;
  durationMinutes: number;
  prerequisites: string[];
  targetRoles: TrainingRole[];
  difficulty: TrainingDifficultyValue;
  requirement: {
    minimumScore: number;
    validityPeriodDays: number;
    mandatory: boolean;
    maxAttempts: number;
  };
  intro: string;
  sections: MarkdownSection[];
  practice: string;
  keywords: string[];
};

type TrainingModuleRow = {
  id: string;
  name: string;
  description: string;
  contentType: 'TEXT';
  content: Prisma.InputJsonValue;
  durationMinutes: number;
  category: string;
  prerequisites: string[];
  targetRoles: string[];
  isPublic: boolean;
  difficulty: TrainingDifficultyValue;
};

type TrainingRecordRow = {
  id: string;
  learnerId: string;
  learnerRole: TrainingRole;
  moduleId: string;
  status: TrainingStatusValue;
  startedAt?: Date;
  completedAt?: Date;
  score?: number;
  attempts: number;
  progress?: Prisma.InputJsonValue;
  expiresAt?: Date;
};

type TrainingBadgeRow = {
  id: string;
  learnerId: string;
  type: string;
  reason: string;
  metadata: Prisma.InputJsonValue;
  awardedAt: Date;
};

type TrainingLeaderboardRow = {
  learnerId: string;
  totalScore: number;
  modulesCount: number;
  badgesCount: number;
};

type TrainingSeedPlan = {
  admin: {
    id: string;
    email: string;
    passwordHash: string;
    role: 'SYSTEM';
    status: 'ACTIVE';
    publicCode: string;
    phoneNumber: string;
    firstName: string;
    lastName: string;
    timezone: string;
    language: string;
    twoFactorSecret: string;
    twoFactorEncryptedSecret: string;
    twoFactorBackupCodes: string[];
    userAttributes: Prisma.InputJsonValue;
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  addressId: string;
  twoFactorId: string;
  trainingModules: TrainingModuleRow[];
  trainingRequirements: Array<{
    module: string;
    minimumScore: number;
    validityPeriodDays: number;
    mandatory: boolean;
    maxAttempts: number;
  }>;
  trainingRecords: TrainingRecordRow[];
  trainingBadges: TrainingBadgeRow[];
  trainingLeaderboard: TrainingLeaderboardRow;
};

const TRAINING_CONFIRMATIONS = new Set(['maysar-staging-marketplace', 'maysar-staging-training']);
const TRAINING_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'ADMIN#@1243#';
const TRAINING_ADMIN_TOTP_SECRET = process.env.SEED_ADMIN_TOTP_SECRET || 'JBSWY3DPEHPK3PXP';
const TRAINING_2FA_ENCRYPTION_KEY = process.env.TWO_FACTOR_ENCRYPTION_KEY || 'default-two-factor-encryption-key-32-chars!!';
const TRAINING_PII_HMAC_SECRET = process.env.PII_HMAC_SECRET || 'default-hmac-secret-for-dev';
const TRAINING_BCRYPT_SALT = '$2b$10$C6UzMDM.H6dfI/f/IKcEe.';
const TRAINING_ADMIN_ROLE: TrainingRole = 'system';
const TRAINING_ALL_ROLES: TrainingRole[] = ['buyer', 'seller', 'supplier', 'courier', 'enabler', 'system'];
const TRAINING_ADMIN_PROFILE = {
  email: 'admin@maysar.co.tz',
  firstName: 'Maysar',
  lastName: 'Admin',
  publicCode: 'MYS-ADM-01',
  phoneNumber: '+255700000000',
  timezone: 'Africa/Dar_es_Salaam',
  language: 'en',
  street: 'Mlimani City, Sam Nujoma Road',
  city: 'Dar es Salaam',
  region: 'Dar es Salaam',
  postalCode: '14112',
  country: 'Tanzania'
} as const;
const TRAINING_ADMIN_ID = seedId('usr', TRAINING_ADMIN_PROFILE.email);
const TRAINING_ADMIN_ADDRESS_ID = seedId('usr_addr', TRAINING_ADMIN_PROFILE.email);
const TRAINING_ADMIN_2FA_ID = seedId('usr_2fa', TRAINING_ADMIN_PROFILE.email);

function seedId(prefix: string, value: string): string {
  const slug = slugify(value).replace(/-/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  const hash = shortHash(`${prefix}:${value}`, 8).toLowerCase();
  const raw = `${prefix}_${slug || 'seed'}_${hash}`;
  return raw.slice(0, 64).replace(/_+$/g, '');
}

const daysAgo = (days: number, base = new Date()): Date => new Date(base.getTime() - days * 24 * 60 * 60 * 1000);
const daysFrom = (base: Date, days: number): Date => new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
const hoursAgo = (hours: number, base = new Date()): Date => new Date(base.getTime() - hours * 60 * 60 * 1000);

const buildMarkdownBody = (title: string, intro: string, sections: MarkdownSection[], practice: string): string => {
  const parts = [
    `# ${title}`,
    intro,
    ...sections.map((section) => {
      const lines = [`## ${section.heading}`];
      if (section.note) {
        lines.push(section.note);
      }
      lines.push(...section.bullets.map((bullet) => `- ${bullet}`));
      return lines.join('\n');
    }),
    '## Practice',
    practice
  ];
  return parts.join('\n\n');
};

const buildHmacHash = (value: string): string =>
  crypto.createHmac('sha256', TRAINING_PII_HMAC_SECRET).update(value).digest('hex');

const resolveTwoFactorKey = (value: string): Buffer => {
  if (!value || (value.length !== 32 && value.length !== 64)) {
    return crypto.createHash('sha256').update(value).digest();
  }
  return Buffer.from(value, value.length === 64 ? 'hex' : 'utf8');
};

const encryptTwoFactorSecret = (secret: string): string => {
  const key = resolveTwoFactorKey(TRAINING_2FA_ENCRYPTION_KEY);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted}`;
};

const buildBackupCodes = (seedKey: string, count = 10): string[] => {
  const plainCodes = Array.from({ length: count }, (_, index) => shortHash(`${seedKey}:${index + 1}`, 10));
  return plainCodes.map((plain) => bcrypt.hashSync(plain, 10));
};

const buildTrainingModule = (config: TrainingModuleSeed): TrainingModuleRow => {
  const id = seedId('trn_mod', config.slug);
  return {
    id,
    name: config.name,
    description: config.description,
    contentType: 'TEXT',
    content: {
      type: 'TEXT',
      body: buildMarkdownBody(config.name, config.intro, config.sections, config.practice),
      metadata: {
        seedMarker: SEED_MARKER,
        slug: config.slug,
        category: config.category,
        audience: config.targetRoles,
        keywords: config.keywords,
        practice: config.practice,
        format: 'text-only'
      }
    },
    durationMinutes: config.durationMinutes,
    category: config.category,
    prerequisites: config.prerequisites,
    targetRoles: config.targetRoles,
    isPublic: true,
    difficulty: config.difficulty
  };
};

const TRAINING_MODULE_SEEDS: TrainingModuleSeed[] = [
  {
    slug: 'platform-orientation',
    name: 'Platform Orientation for Tanzanian Trade',
    description: 'Text-only onboarding for the Maysar marketplace and its role model.',
    category: 'onboarding',
    durationMinutes: 22,
    prerequisites: [],
    targetRoles: TRAINING_ALL_ROLES,
    difficulty: 'BEGINNER',
    requirement: { minimumScore: 65, validityPeriodDays: 365, mandatory: true, maxAttempts: 3 },
    intro: 'This module explains how a listing moves from discovery to settlement in the Tanzanian market context.',
    sections: [
      {
        heading: 'Core Roles',
        bullets: [
          'Buyers search and place orders.',
          'Sellers publish listings and manage stock.',
          'Couriers move goods and confirm delivery.'
        ]
      },
      {
        heading: 'Marketplace Flow',
        bullets: [
          'A clear title makes search and moderation easier.',
          'Orders should move from placement to fulfilment without missing stock checks.',
          'Settlement and support must always leave an audit trail.'
        ]
      },
      {
        heading: 'Tanzanian Examples',
        bullets: [
          'Kariakoo traders need fast stock turns and exact product names.',
          'Stone Town sellers benefit from better spice descriptions.',
          'Arusha and Mbeya routes need reliable handoff notes for couriers.'
        ]
      }
    ],
    practice: 'Sketch a route for 10 sacks of sembe flour moving from Kariakoo to Mbeya.',
    keywords: ['onboarding', 'roles', 'trade flow', 'Tanzania']
  },
  {
    slug: 'verification-and-kyc',
    name: 'Verification, KYC, and Profile Quality',
    description: 'How to keep account records accurate and ready for review.',
    category: 'verification',
    durationMinutes: 24,
    prerequisites: [seedId('trn_mod', 'platform-orientation')],
    targetRoles: ['seller', 'supplier', 'enabler', 'system'],
    difficulty: 'BEGINNER',
    requirement: { minimumScore: 70, validityPeriodDays: 365, mandatory: true, maxAttempts: 3 },
    intro: 'Verification is about matching the business story with the documents, the phone number, and the location.',
    sections: [
      {
        heading: 'Required Signals',
        bullets: [
          'Use a real legal name, phone number, and email.',
          'Match the registration number to the exact business entity.',
          'Keep the address specific enough for courier handoff.'
        ]
      },
      {
        heading: 'Common Issues',
        bullets: [
          'Generic shop names without a matching licence.',
          'Mismatched phone numbers or expired documents.',
          'Addresses that only mention a region without a street or market name.'
        ]
      },
      {
        heading: 'Review Habits',
        bullets: [
          'Check documents before the first live sale.',
          'Re-check the profile after ownership or phone changes.',
          'Record who completed the verification and when.'
        ]
      }
    ],
    practice: 'Write a verification checklist for a spice trader in Stone Town.',
    keywords: ['kyc', 'verification', 'documents', 'profile quality']
  },
  {
    slug: 'listing-writing',
    name: 'Product Listing Writing for Search',
    description: 'How to write clear titles, descriptions, and variants for Tanzanian products.',
    category: 'catalog',
    durationMinutes: 26,
    prerequisites: [seedId('trn_mod', 'verification-and-kyc')],
    targetRoles: ['seller', 'supplier', 'system'],
    difficulty: 'BEGINNER',
    requirement: { minimumScore: 75, validityPeriodDays: 365, mandatory: true, maxAttempts: 4 },
    intro: 'A strong listing should describe exactly what is sold, in what unit, and for which buyer segment.',
    sections: [
      {
        heading: 'Title Structure',
        bullets: [
          'Put the product name first, then the size or pack format.',
          'Use familiar Tanzanian terms when they are widely understood.',
          'Avoid vague labels like best deal or quality item.'
        ]
      },
      {
        heading: 'Description Structure',
        bullets: [
          'Explain the use case, pack size, and storage notes.',
          'State whether the item is local, imported, or blended.',
          'Describe what is and is not included in the box or bundle.'
        ]
      },
      {
        heading: 'Examples',
        bullets: [
          'Mchele wa Mbeya 5kg - polished rice for household and restaurant use.',
          'Cloves from Zanzibar 250g - whole dried cloves for cooking and export.',
          'Solar lamp 10W - portable light for kiosks and rural homes.'
        ]
      }
    ],
    practice: 'Rewrite one weak title into a search-friendly title using a Tanzanian product you know.',
    keywords: ['product copy', 'search', 'titles', 'units']
  },
  {
    slug: 'fulfilment-support',
    name: 'Fulfilment, COD, and Support',
    description: 'How to keep inventory honest, hand off goods, and handle support updates.',
    category: 'operations',
    durationMinutes: 28,
    prerequisites: [seedId('trn_mod', 'listing-writing')],
    targetRoles: ['seller', 'courier', 'enabler', 'system'],
    difficulty: 'INTERMEDIATE',
    requirement: { minimumScore: 68, validityPeriodDays: 365, mandatory: true, maxAttempts: 3 },
    intro: 'Inventory discipline, delivery timing, and customer support should work as one continuous service.',
    sections: [
      {
        heading: 'Stock Discipline',
        bullets: [
          'Track available, reserved, and damaged stock separately.',
          'Set a reorder point before the shelf is empty.',
          'Record batch numbers when expiry matters.'
        ]
      },
      {
        heading: 'Handoff Notes',
        bullets: [
          'Write the pickup time, location, and responsible person clearly.',
          'Label the package with the order reference and contact number.',
          'Keep a short note about substitutions if a stock item changed.'
        ]
      },
      {
        heading: 'Support Handling',
        bullets: [
          'Start with the order reference, not a long explanation.',
          'Separate facts, assumptions, and next actions.',
          'Escalate when the issue needs a different role or approval.'
        ]
      }
    ],
    practice: 'Draft a support reply for a delivery that arrived two hours late in Dar es Salaam.',
    keywords: ['stock', 'delivery', 'support', 'COD']
  },
  {
    slug: 'compliance-governance',
    name: 'Compliance, Tax, and Admin Governance',
    description: 'How the system role handles documents, access reviews, and sensitive changes.',
    category: 'governance',
    durationMinutes: 30,
    prerequisites: [seedId('trn_mod', 'verification-and-kyc'), seedId('trn_mod', 'fulfilment-support')],
    targetRoles: ['enabler', 'system'],
    difficulty: 'ADVANCED',
    requirement: { minimumScore: 90, validityPeriodDays: 365, mandatory: true, maxAttempts: 2 },
    intro: 'Compliance is about current documents, and governance is about protecting access and keeping a clean trail.',
    sections: [
      {
        heading: 'Document Basics',
        bullets: [
          'Keep the registration number and tax ID in the same business profile.',
          'Store the business licence, tax certificate, and registration proof together.',
          'Use clear expiry reminders instead of relying on memory.'
        ]
      },
      {
        heading: 'Access Reviews',
        bullets: [
          'Check elevated accounts on a recurring schedule.',
          'Remove access that no longer matches the current duty.',
          'Review failed login spikes and lockouts.'
        ]
      },
      {
        heading: 'Escalation Rules',
        bullets: [
          'Escalate when a request affects money, identity, or access.',
          'Keep the evidence close to the final decision.',
          'Use short, factual notes that survive handover.'
        ]
      }
    ],
    practice: 'Write a short access-review note for a system account that no longer needs seller permissions.',
    keywords: ['compliance', 'tax', 'governance', 'access review']
  }
];

const buildTrainingSeedPlan = (seedNow: Date): TrainingSeedPlan => {
  const adminPasswordHash = bcrypt.hashSync(TRAINING_ADMIN_PASSWORD, TRAINING_BCRYPT_SALT);
  const adminTwoFactorSecretEncrypted = encryptTwoFactorSecret(TRAINING_ADMIN_TOTP_SECRET);
  const adminBackupCodes = buildBackupCodes(`${TRAINING_ADMIN_PROFILE.email}:${SEED_MARKER}`);

  const admin = {
    id: TRAINING_ADMIN_ID,
    email: TRAINING_ADMIN_PROFILE.email.toLowerCase(),
    passwordHash: adminPasswordHash,
    role: 'SYSTEM' as const,
    status: 'ACTIVE' as const,
    publicCode: TRAINING_ADMIN_PROFILE.publicCode,
    phoneNumber: TRAINING_ADMIN_PROFILE.phoneNumber,
    firstName: TRAINING_ADMIN_PROFILE.firstName,
    lastName: TRAINING_ADMIN_PROFILE.lastName,
    timezone: TRAINING_ADMIN_PROFILE.timezone,
    language: TRAINING_ADMIN_PROFILE.language,
    twoFactorSecret: TRAINING_ADMIN_TOTP_SECRET,
    twoFactorEncryptedSecret: adminTwoFactorSecretEncrypted,
    twoFactorBackupCodes: adminBackupCodes,
    userAttributes: {
      source: SEED_MARKER,
      profileType: 'system-admin',
      authority: 'full-system-access',
      canManageAllRoles: true,
      allowedRoles: TRAINING_ALL_ROLES
    },
    address: {
      street: TRAINING_ADMIN_PROFILE.street,
      city: TRAINING_ADMIN_PROFILE.city,
      state: TRAINING_ADMIN_PROFILE.region,
      postalCode: TRAINING_ADMIN_PROFILE.postalCode,
      country: TRAINING_ADMIN_PROFILE.country
    }
  };

  const trainingModules = TRAINING_MODULE_SEEDS.map(buildTrainingModule);
  const moduleBySlug = new Map(TRAINING_MODULE_SEEDS.map((seed, index) => [seed.slug, trainingModules[index]]));

  const trainingRequirements = TRAINING_MODULE_SEEDS.map((seed, index) => ({
    module: trainingModules[index].id,
    minimumScore: seed.requirement.minimumScore,
    validityPeriodDays: seed.requirement.validityPeriodDays,
    mandatory: seed.requirement.mandatory,
    maxAttempts: seed.requirement.maxAttempts
  }));

  const records: TrainingRecordRow[] = [
    {
      id: seedId('trn_rec', `${admin.email}:platform-orientation`),
      learnerId: admin.id,
      learnerRole: TRAINING_ADMIN_ROLE,
      moduleId: moduleBySlug.get('platform-orientation')!.id,
      status: 'COMPLETED',
      startedAt: daysAgo(12, seedNow),
      completedAt: daysAgo(12, seedNow),
      score: 98,
      attempts: 1,
      progress: { completedSections: ['core-roles', 'marketplace-flow', 'tanzanian-examples'] },
      expiresAt: daysFrom(daysAgo(12, seedNow), TRAINING_MODULE_SEEDS[0].requirement.validityPeriodDays)
    },
    {
      id: seedId('trn_rec', `${admin.email}:verification-and-kyc`),
      learnerId: admin.id,
      learnerRole: TRAINING_ADMIN_ROLE,
      moduleId: moduleBySlug.get('verification-and-kyc')!.id,
      status: 'COMPLETED',
      startedAt: daysAgo(11, seedNow),
      completedAt: daysAgo(11, seedNow),
      score: 95,
      attempts: 1,
      progress: { completedSections: ['required-signals', 'common-issues', 'review-habits'] },
      expiresAt: daysFrom(daysAgo(11, seedNow), TRAINING_MODULE_SEEDS[1].requirement.validityPeriodDays)
    },
    {
      id: seedId('trn_rec', `${admin.email}:listing-writing`),
      learnerId: admin.id,
      learnerRole: TRAINING_ADMIN_ROLE,
      moduleId: moduleBySlug.get('listing-writing')!.id,
      status: 'COMPLETED',
      startedAt: daysAgo(10, seedNow),
      completedAt: daysAgo(10, seedNow),
      score: 92,
      attempts: 1,
      progress: { completedSections: ['title-structure', 'description-structure', 'examples'] },
      expiresAt: daysFrom(daysAgo(10, seedNow), TRAINING_MODULE_SEEDS[2].requirement.validityPeriodDays)
    },
    {
      id: seedId('trn_rec', `${admin.email}:fulfilment-support`),
      learnerId: admin.id,
      learnerRole: TRAINING_ADMIN_ROLE,
      moduleId: moduleBySlug.get('fulfilment-support')!.id,
      status: 'FAILED',
      startedAt: daysAgo(8, seedNow),
      completedAt: daysAgo(8, seedNow),
      score: 58,
      attempts: 2,
      progress: { blocker: 'Recount required for the farm crate handoff.' }
    },
    {
      id: seedId('trn_rec', `${admin.email}:compliance-governance`),
      learnerId: admin.id,
      learnerRole: TRAINING_ADMIN_ROLE,
      moduleId: moduleBySlug.get('compliance-governance')!.id,
      status: 'IN_PROGRESS',
      startedAt: daysAgo(3, seedNow),
      attempts: 1,
      progress: {
        percentComplete: 45,
        completedSections: ['document-basics'],
        lastTouchedAt: hoursAgo(6, seedNow).toISOString()
      }
    }
  ];

  const completedRecords = records.filter((record) => record.status === 'COMPLETED');
  const badges: TrainingBadgeRow[] = [
    {
      id: seedId('trn_badge', `${admin.email}:platform-verified`),
      learnerId: admin.id,
      type: 'platform-verified',
      reason: 'Completed the core platform orientation module.',
      metadata: { moduleId: moduleBySlug.get('platform-orientation')!.id, score: 98, seedMarker: SEED_MARKER },
      awardedAt: daysAgo(12, seedNow)
    },
    {
      id: seedId('trn_badge', `${admin.email}:catalog-quality`),
      learnerId: admin.id,
      type: 'catalog-quality',
      reason: 'Demonstrated clear search-friendly product writing.',
      metadata: { moduleId: moduleBySlug.get('listing-writing')!.id, score: 92, seedMarker: SEED_MARKER },
      awardedAt: daysAgo(10, seedNow)
    },
    {
      id: seedId('trn_badge', `${admin.email}:verification-ready`),
      learnerId: admin.id,
      type: 'verification-ready',
      reason: 'Completed the verification and profile quality module.',
      metadata: { moduleId: moduleBySlug.get('verification-and-kyc')!.id, score: 95, seedMarker: SEED_MARKER },
      awardedAt: daysAgo(11, seedNow)
    }
  ];

  return {
    admin,
    addressId: TRAINING_ADMIN_ADDRESS_ID,
    twoFactorId: TRAINING_ADMIN_2FA_ID,
    trainingModules,
    trainingRequirements,
    trainingRecords: records,
    trainingBadges: badges,
    trainingLeaderboard: {
      learnerId: admin.id,
      totalScore: completedRecords.reduce((sum, record) => sum + (record.score || 0), 0),
      modulesCount: completedRecords.length,
      badgesCount: badges.length
    }
  };
};

const printPlanSummary = (plan: TrainingSeedPlan): void => {
  console.log('[seed] dry-run summary');
  console.log(`- admin: ${plan.admin.email} (${plan.admin.role})`);
  console.log(`- training modules: ${plan.trainingModules.length}`);
  console.log(`- training requirements: ${plan.trainingRequirements.length}`);
  console.log(`- training records: ${plan.trainingRecords.length}`);
  console.log(`- badges: ${plan.trainingBadges.length}`);
  console.log('- textual only: yes');
};

const persistTrainingSeed = async (prisma: PrismaClient, plan: TrainingSeedPlan): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    await tx.user.upsert({
      where: { id: plan.admin.id },
      update: {
        email: plan.admin.email,
        passwordHash: plan.admin.passwordHash,
        role: plan.admin.role,
        status: plan.admin.status,
        phoneNumber: plan.admin.phoneNumber,
        isEmailVerified: true,
        isPhoneVerified: true,
        failedLoginAttempts: 0,
        lockoutUntil: null,
        lastLoginAt: null,
        passwordChangedAt: null,
        twoFactorEnabled: true,
        twoFactorSecret: plan.admin.twoFactorSecret
      },
      create: {
        id: plan.admin.id,
        email: plan.admin.email,
        passwordHash: plan.admin.passwordHash,
        role: plan.admin.role,
        status: plan.admin.status,
        publicCode: plan.admin.publicCode,
        phoneNumber: plan.admin.phoneNumber,
        isEmailVerified: true,
        isPhoneVerified: true,
        failedLoginAttempts: 0,
        twoFactorEnabled: true,
        twoFactorSecret: plan.admin.twoFactorSecret
      }
    });

    await tx.auth_User.upsert({
      where: { id: plan.admin.id },
      update: {
        publicCode: plan.admin.publicCode,
        email: plan.admin.email,
        passwordHash: plan.admin.passwordHash,
        role: plan.admin.role,
        status: plan.admin.status,
        twoFactorEnabled: true,
        twoFactorSecret: plan.admin.twoFactorSecret
      },
      create: {
        id: plan.admin.id,
        publicCode: plan.admin.publicCode,
        email: plan.admin.email,
        passwordHash: plan.admin.passwordHash,
        role: plan.admin.role,
        status: plan.admin.status,
        twoFactorEnabled: true,
        twoFactorSecret: plan.admin.twoFactorSecret
      }
    });

    await tx.auth_UserIndex.upsert({
      where: {
        userId_indexType: {
          userId: plan.admin.id,
          indexType: 'email'
        }
      },
      update: { value: plan.admin.email },
      create: { userId: plan.admin.id, indexType: 'email', value: plan.admin.email }
    });

    await tx.auth_UserIndex.upsert({
      where: {
        userId_indexType: {
          userId: plan.admin.id,
          indexType: 'publicCode'
        }
      },
      update: { value: plan.admin.publicCode },
      create: { userId: plan.admin.id, indexType: 'publicCode', value: plan.admin.publicCode }
    });

    await tx.auth_UserIndex.upsert({
      where: {
        userId_indexType: {
          userId: plan.admin.id,
          indexType: 'phone'
        }
      },
      update: { value: plan.admin.phoneNumber },
      create: { userId: plan.admin.id, indexType: 'phone', value: plan.admin.phoneNumber }
    });

    await tx.user_User.upsert({
      where: { id: plan.admin.id },
      update: {
        publicCode: plan.admin.publicCode,
        email: plan.admin.email,
        passwordHash: plan.admin.passwordHash,
        role: plan.admin.role,
        status: plan.admin.status,
        firstName: plan.admin.firstName,
        lastName: plan.admin.lastName,
        phoneNumber: plan.admin.phoneNumber,
        isEmailVerified: true,
        isPhoneVerified: true,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        failedLoginAttempts: 0,
        lockoutUntil: null,
        lastLoginAt: null,
        passwordChangedAt: null,
        twoFactorEnabled: true,
        twoFactorSecret: plan.admin.twoFactorSecret,
        language: plan.admin.language,
        timezone: plan.admin.timezone,
        notificationsEnabled: true,
        codEnabled: false,
        codReputationScore: 100,
        codSuccessfulOrders: 0,
        codFailedOrders: 0,
        codTotalOrders: 0,
        codLastOrderAt: null,
        codSuspendedUntil: null,
        codPermanentlyDisabled: false,
        attributes: plan.admin.userAttributes
      },
      create: {
        id: plan.admin.id,
        publicCode: plan.admin.publicCode,
        email: plan.admin.email,
        passwordHash: plan.admin.passwordHash,
        role: plan.admin.role,
        status: plan.admin.status,
        firstName: plan.admin.firstName,
        lastName: plan.admin.lastName,
        phoneNumber: plan.admin.phoneNumber,
        isEmailVerified: true,
        isPhoneVerified: true,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        twoFactorEnabled: true,
        twoFactorSecret: plan.admin.twoFactorSecret,
        language: plan.admin.language,
        timezone: plan.admin.timezone,
        notificationsEnabled: true,
        codEnabled: false,
        codReputationScore: 100,
        codSuccessfulOrders: 0,
        codFailedOrders: 0,
        codTotalOrders: 0,
        codPermanentlyDisabled: false,
        attributes: plan.admin.userAttributes
      }
    });

    await tx.user_UserIndex.upsert({
      where: {
        userId_indexType: {
          userId: plan.admin.id,
          indexType: 'email'
        }
      },
      update: { value: buildHmacHash(plan.admin.email) },
      create: { userId: plan.admin.id, indexType: 'email', value: buildHmacHash(plan.admin.email) }
    });

    await tx.user_UserIndex.upsert({
      where: {
        userId_indexType: {
          userId: plan.admin.id,
          indexType: 'phone'
        }
      },
      update: { value: buildHmacHash(plan.admin.phoneNumber) },
      create: { userId: plan.admin.id, indexType: 'phone', value: buildHmacHash(plan.admin.phoneNumber) }
    });

    await tx.user_UserAddress.upsert({
      where: { id: plan.addressId },
      update: {
        userId: plan.admin.id,
        type: 'HOME',
        street: plan.admin.address.street,
        city: plan.admin.address.city,
        state: plan.admin.address.state,
        postalCode: plan.admin.address.postalCode,
        country: plan.admin.address.country,
        isDefault: true
      },
      create: {
        id: plan.addressId,
        userId: plan.admin.id,
        type: 'HOME',
        street: plan.admin.address.street,
        city: plan.admin.address.city,
        state: plan.admin.address.state,
        postalCode: plan.admin.address.postalCode,
        country: plan.admin.address.country,
        isDefault: true
      }
    });

    await tx.user_TwoFactorAuth.upsert({
      where: { userId: plan.admin.id },
      update: {
        method: 'totp',
        secret: plan.admin.twoFactorEncryptedSecret,
        backupCodes: plan.admin.twoFactorBackupCodes,
        isEnabled: true,
        isVerified: true,
        deviceName: 'Maysar staging admin device',
        lastUsedAt: null
      },
      create: {
        id: plan.twoFactorId,
        userId: plan.admin.id,
        method: 'totp',
        secret: plan.admin.twoFactorEncryptedSecret,
        backupCodes: plan.admin.twoFactorBackupCodes,
        isEnabled: true,
        isVerified: true,
        deviceName: 'Maysar staging admin device',
        lastUsedAt: null
      }
    });

    for (const module of plan.trainingModules) {
      await tx.training_TrainingModule.upsert({
        where: { id: module.id },
        update: {
          name: module.name,
          description: module.description,
          contentType: module.contentType,
          content: module.content,
          durationMinutes: module.durationMinutes,
          category: module.category,
          prerequisites: module.prerequisites,
          targetRoles: module.targetRoles,
          isPublic: module.isPublic,
          difficulty: module.difficulty
        },
        create: {
          id: module.id,
          name: module.name,
          description: module.description,
          contentType: module.contentType,
          content: module.content,
          durationMinutes: module.durationMinutes,
          category: module.category,
          prerequisites: module.prerequisites,
          targetRoles: module.targetRoles,
          isPublic: module.isPublic,
          difficulty: module.difficulty
        }
      });
    }

    for (const requirement of plan.trainingRequirements) {
      await tx.training_CertificationRequirement.upsert({
        where: { module: requirement.module },
        update: {
          minimumScore: requirement.minimumScore,
          validityPeriodDays: requirement.validityPeriodDays,
          mandatory: requirement.mandatory,
          maxAttempts: requirement.maxAttempts
        },
        create: requirement
      });
    }

    for (const record of plan.trainingRecords) {
      await tx.training_TrainingRecord.upsert({
        where: { id: record.id },
        update: {
          learnerId: record.learnerId,
          learnerRole: record.learnerRole,
          moduleId: record.moduleId,
          status: record.status,
          startedAt: record.startedAt,
          completedAt: record.completedAt,
          score: record.score,
          attempts: record.attempts,
          progress: record.progress,
          expiresAt: record.expiresAt
        },
        create: {
          id: record.id,
          learnerId: record.learnerId,
          learnerRole: record.learnerRole,
          moduleId: record.moduleId,
          status: record.status,
          startedAt: record.startedAt,
          completedAt: record.completedAt,
          score: record.score,
          attempts: record.attempts,
          progress: record.progress,
          expiresAt: record.expiresAt
        }
      });
    }

    for (const badge of plan.trainingBadges) {
      await tx.training_Badge.upsert({
        where: { id: badge.id },
        update: {
          learnerId: badge.learnerId,
          type: badge.type,
          reason: badge.reason,
          metadata: badge.metadata,
          awardedAt: badge.awardedAt
        },
        create: {
          id: badge.id,
          learnerId: badge.learnerId,
          type: badge.type,
          reason: badge.reason,
          metadata: badge.metadata,
          awardedAt: badge.awardedAt
        }
      });
    }

    await tx.training_LeaderboardEntry.upsert({
      where: { learnerId: plan.trainingLeaderboard.learnerId },
      update: {
        totalScore: plan.trainingLeaderboard.totalScore,
        modulesCount: plan.trainingLeaderboard.modulesCount,
        badgesCount: plan.trainingLeaderboard.badgesCount
      },
      create: {
        learnerId: plan.trainingLeaderboard.learnerId,
        totalScore: plan.trainingLeaderboard.totalScore,
        modulesCount: plan.trainingLeaderboard.modulesCount,
        badgesCount: plan.trainingLeaderboard.badgesCount
      }
    });
  }, {
    maxWait: 120000,
    timeout: 120000
  });
};

const main = async (): Promise<void> => {
  const dryRun = process.argv.includes('--dry-run');
  const confirm = String(process.env.SEED_CONFIRM || '').trim();
  const nodeEnv = String(process.env.NODE_ENV || '').trim().toLowerCase();
  const scope = String(process.env.SEED_SCOPE || '').trim().toLowerCase();

  if (nodeEnv !== 'staging') {
    throw new Error('Refusing to seed: NODE_ENV must be staging.');
  }
  if (scope !== 'staging') {
    throw new Error('Refusing to seed: SEED_SCOPE must be staging.');
  }
  if (!TRAINING_CONFIRMATIONS.has(confirm)) {
    throw new Error('Refusing to seed: SEED_CONFIRM does not match the approved staging seed token.');
  }

  const seedNow = now();
  const plan = buildTrainingSeedPlan(seedNow);

  if (dryRun) {
    printPlanSummary(plan);
    console.log(`- admin user id: ${plan.admin.id}`);
    return;
  }

  const normalizedDatabaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
  if (!normalizedDatabaseUrl) {
    throw new Error('DATABASE_URL is required to run the staging seed.');
  }

  process.env.DATABASE_URL = normalizedDatabaseUrl;
  const prisma = new PrismaClient();

  try {
    await persistTrainingSeed(prisma, plan);
    console.log('[seed] training data seeded successfully');
    console.log(`- admin: ${plan.admin.email}`);
    console.log(`- training modules: ${plan.trainingModules.length}`);
    console.log(`- completed records: ${plan.trainingRecords.filter((record) => record.status === 'COMPLETED').length}`);
    console.log(`- badges: ${plan.trainingBadges.length}`);
  } finally {
    await prisma.$disconnect();
  }
};

void main().catch((error: unknown) => {
  console.error('[seed] failed to seed training data');
  console.error(error);
  process.exit(1);
});

const ADMIN_PROFILE = {
  email: 'admin@maysar.co.tz',
  firstName: 'Maysar',
  lastName: 'Admin',
  publicCode: 'MYS-ADM-01',
  phoneNumber: '+255700000000',
  timezone: 'Africa/Dar_es_Salaam',
  language: 'en',
  city: 'Dar es Salaam',
  region: 'Dar es Salaam',
  street: 'Mlimani City, Sam Nujoma Road',
  postalCode: '14112',
  country: 'Tanzania',
  kycSubject: 'Maysar Platform Admin',
  attributes: {
    source: SEED_MARKER,
    authority: 'full-system-access',
    canManageAllRoles: true
  }
} as const;

const SELLER_PROFILES = [
  {
    email: 'asha.mwakalobo@maysar.co.tz',
    firstName: 'Asha',
    lastName: 'Mwakalobo',
    publicCode: 'MYS-SLR-01',
    phoneNumber: '+255700000101',
    businessName: 'Kariakoo Market Supplies',
    businessType: 'SOLE_PROPRIETORSHIP' as const,
    registrationNumber: 'TZ-DAR-20260001',
    taxId: '100000001',
    description: 'Wholesale trader serving Kariakoo and nearby retail shops with fast-moving consumer goods.',
    industries: ['food', 'beverages', 'home'],
    website: 'https://kariakoo.maysar.co.tz',
    businessEmail: 'sales@kariakoo.maysar.co.tz',
    businessPhone: '+255700000201',
    city: 'Dar es Salaam',
    region: 'Dar es Salaam',
    street: 'Kariakoo Market Street 12',
    postalCode: '11101',
    complianceNotes: 'Primary wholesale seller for food staples and home goods.',
    attributes: {
      storeCount: 3,
      channels: ['market-stall', 'wholesale', 'whatsapp'],
      focus: 'wholesale'
    }
  },
  {
    email: 'juma.mussa@maysar.co.tz',
    firstName: 'Juma',
    lastName: 'Mussa',
    publicCode: 'MYS-SLR-02',
    phoneNumber: '+255700000102',
    businessName: 'Northern Harvest Co-op',
    businessType: 'PARTNERSHIP' as const,
    registrationNumber: 'TZ-ARU-20260002',
    taxId: '100000002',
    description: 'Farm-to-market collective supplying fresh produce and agri inputs from the northern corridor.',
    industries: ['fresh produce', 'agriculture', 'logistics'],
    website: 'https://northernharvest.maysar.co.tz',
    businessEmail: 'hello@northernharvest.maysar.co.tz',
    businessPhone: '+255700000202',
    city: 'Arusha',
    region: 'Arusha',
    street: 'Nairobi Road 88',
    postalCode: '23101',
    complianceNotes: 'Fresh produce and farm input seller for northern corridor markets.',
    attributes: {
      storeCount: 2,
      channels: ['farm-gate', 'wholesale'],
      focus: 'fresh-produce'
    }
  },
  {
    email: 'neema.hassan@maysar.co.tz',
    firstName: 'Neema',
    lastName: 'Hassan',
    publicCode: 'MYS-SLR-03',
    phoneNumber: '+255700000103',
    businessName: 'Spice Coast Traders',
    businessType: 'LIMITED_LIABILITY' as const,
    registrationNumber: 'TZ-ZNZ-20260003',
    taxId: '100000003',
    description: 'Island trader focused on spices, beauty products, and wellness goods.',
    industries: ['spices', 'beauty', 'wellness'],
    website: 'https://spicecoast.maysar.co.tz',
    businessEmail: 'care@spicecoast.maysar.co.tz',
    businessPhone: '+255700000203',
    city: 'Zanzibar',
    region: 'Zanzibar',
    street: 'Stone Town Spice Lane 5',
    postalCode: '71101',
    complianceNotes: 'Spice and personal care retailer with a strong island market presence.',
    attributes: {
      storeCount: 2,
      channels: ['retail', 'export'],
      focus: 'spices'
    }
  },
  {
    email: 'abdul.karim@maysar.co.tz',
    firstName: 'Abdul',
    lastName: 'Karim',
    publicCode: 'MYS-SLR-04',
    phoneNumber: '+255700000104',
    businessName: 'Lake Zone Textiles & Build',
    businessType: 'CORPORATION' as const,
    registrationNumber: 'TZ-MWZ-20260004',
    taxId: '100000004',
    description: 'Textile, hardware, and artisan goods distributor around the lake zone.',
    industries: ['fashion', 'building materials', 'crafts'],
    website: 'https://lakezone.maysar.co.tz',
    businessEmail: 'office@lakezone.maysar.co.tz',
    businessPhone: '+255700000204',
    city: 'Mwanza',
    region: 'Mwanza',
    street: 'Soko Kuu Road 44',
    postalCode: '33101',
    complianceNotes: 'Textile, hardware, and artisan goods distributor around the lake zone.',
    attributes: {
      storeCount: 4,
      channels: ['retail', 'delivery'],
      focus: 'fashion-and-hardware'
    }
  },
  {
    email: 'halima.said@maysar.co.tz',
    firstName: 'Halima',
    lastName: 'Said',
    publicCode: 'MYS-SLR-05',
    phoneNumber: '+255700000105',
    businessName: 'Southern Highlands Market',
    businessType: 'SOLE_PROPRIETORSHIP' as const,
    registrationNumber: 'TZ-MBY-20260005',
    taxId: '100000005',
    description: 'General trade business with a strong foothold in the southern highlands.',
    industries: ['electronics', 'agriculture', 'general trade'],
    website: 'https://southernhighlands.maysar.co.tz',
    businessEmail: 'shop@southernhighlands.maysar.co.tz',
    businessPhone: '+255700000205',
    city: 'Mbeya',
    region: 'Mbeya',
    street: 'Nane Nane Road 21',
    postalCode: '53101',
    complianceNotes: 'General trade business with a strong foothold in the southern highlands.',
    attributes: {
      storeCount: 2,
      channels: ['retail', 'market-truck'],
      focus: 'electronics-and-agriculture'
    }
  }
] as const;

const WAREHOUSES: WarehouseSeed[] = [
  {
    id: makeId('inv_war'),
    code: 'MYS-TZ-DAR-CTR',
    name: 'Dar es Salaam Central Distribution',
    type: 'central',
    address: {
      street: 'Industrial Area, Nyerere Road',
      city: 'Dar es Salaam',
      region: 'Dar es Salaam',
      country: 'Tanzania',
      postalCode: '11103',
      latitude: -6.8007,
      longitude: 39.2879
    },
    capacity: { cubicMeters: 2400, palletSpaces: 900, loadingDocks: 8 },
    operatingHours: { monFri: '07:00-19:00', sat: '08:00-16:00', sun: 'Closed' }
  },
  {
    id: makeId('inv_war'),
    code: 'MYS-TZ-ARU-RGN',
    name: 'Arusha Regional Hub',
    type: 'regional',
    address: {
      street: 'Nairobi Road Logistics Park',
      city: 'Arusha',
      region: 'Arusha',
      country: 'Tanzania',
      postalCode: '23101',
      latitude: -3.3869,
      longitude: 36.683
    },
    capacity: { cubicMeters: 1200, palletSpaces: 420, loadingDocks: 4 },
    operatingHours: { monFri: '07:00-18:00', sat: '08:00-14:00', sun: 'Closed' }
  },
  {
    id: makeId('inv_war'),
    code: 'MYS-TZ-MWZ-RGN',
    name: 'Mwanza Lake Zone Hub',
    type: 'regional',
    address: {
      street: 'Swan Lake Road',
      city: 'Mwanza',
      region: 'Mwanza',
      country: 'Tanzania',
      postalCode: '33101',
      latitude: -2.5164,
      longitude: 32.9175
    },
    capacity: { cubicMeters: 1100, palletSpaces: 360, loadingDocks: 4 },
    operatingHours: { monFri: '07:00-18:00', sat: '08:00-14:00', sun: 'Closed' }
  },
  {
    id: makeId('inv_war'),
    code: 'MYS-TZ-MBY-RGN',
    name: 'Mbeya Southern Hub',
    type: 'regional',
    address: {
      street: 'Nane Nane Grounds Logistics Gate',
      city: 'Mbeya',
      region: 'Mbeya',
      country: 'Tanzania',
      postalCode: '53101',
      latitude: -8.9094,
      longitude: 33.4608
    },
    capacity: { cubicMeters: 980, palletSpaces: 320, loadingDocks: 3 },
    operatingHours: { monFri: '07:00-18:00', sat: '08:00-14:00', sun: 'Closed' }
  }
];

const GROUPS: GroupSeed[] = [
  {
    key: 'food-staples',
    name: 'Food Staples',
    slug: 'food-staples',
    description: 'Essential Tanzanian staples sold in retail and wholesale packs for households and shops.',
    imageTokens: ['tanzania', 'maize', 'grain'],
    brands: ['Mlimani', 'Twiga', 'Kibo', 'Asili', 'Umoja'],
    labels: ['250g', '500g', '1kg', '2kg', '5kg', '10kg', '25kg', '50kg', 'Family Pack'],
    priceBase: 1200,
    priceStep: 1050,
    stockBase: 220,
    stockStep: 10,
    sellerIndex: 0,
    families: [
      { name: 'Sembe Flour', slug: 'sembe-flour', description: 'Sifted maize flour for everyday Tanzanian cooking.', imageTokens: ['maize', 'flour'] },
      { name: 'Rice', slug: 'rice', description: 'Local and premium rice for homes, restaurants, and traders.', imageTokens: ['rice', 'grain'] },
      { name: 'Red Beans', slug: 'red-beans', description: 'Protein-rich beans commonly used in Tanzanian kitchens.', imageTokens: ['beans', 'legumes'] }
    ]
  },
  {
    key: 'beverages',
    name: 'Beverages & Coffee',
    slug: 'beverages-coffee',
    description: 'Tea, coffee, and juices sourced from Tanzania\'s busy retail and wholesale corridors.',
    imageTokens: ['tanzania', 'tea', 'coffee'],
    brands: ['Kagera', 'Mbeya Gold', 'Safari', 'Amani', 'Tembo'],
    labels: ['250ml', '500ml', '750ml', '1L', '1.5L', '2L', '5L', '10L', 'Tin'],
    priceBase: 900,
    priceStep: 780,
    stockBase: 180,
    stockStep: 9,
    sellerIndex: 0,
    families: [
      { name: 'Black Tea', slug: 'black-tea', description: 'Strong black tea blends for morning and evening service.', imageTokens: ['tea', 'cup'] },
      { name: 'Arabica Coffee', slug: 'arabica-coffee', description: 'Roasted Tanzanian coffee for cafes and home brewers.', imageTokens: ['coffee', 'beans'] },
      { name: 'Mango Juice', slug: 'mango-juice', description: 'Fruit juice inspired by Tanzanian orchards and street shops.', imageTokens: ['mango', 'juice'] }
    ]
  },
  {
    key: 'fresh-produce',
    name: 'Fresh Produce',
    slug: 'fresh-produce',
    description: 'Market-fresh fruit and produce sourced from Tanzanian farms and open-air markets.',
    imageTokens: ['tanzania', 'fresh', 'produce'],
    brands: ['Shamba', 'Mkulima', 'Kilimanjaro', 'Soko', 'Asili'],
    labels: ['Loose', '500g', '1kg', '2kg', '5kg', 'Bunch', 'Crate', 'Basket', 'Box'],
    priceBase: 700,
    priceStep: 620,
    stockBase: 160,
    stockStep: 8,
    sellerIndex: 1,
    families: [
      { name: 'Avocados', slug: 'avocados', description: 'Creamy avocados suitable for households, restaurants, and street vendors.', imageTokens: ['avocado', 'fruit'] },
      { name: 'Bananas', slug: 'bananas', description: 'Sweet bananas packed for retail baskets and wholesale trays.', imageTokens: ['banana', 'fruit'] },
      { name: 'Mangoes', slug: 'mangoes', description: 'Seasonal mango varieties sold across Tanzania.', imageTokens: ['mango', 'fruit'] }
    ]
  },
  {
    key: 'spices',
    name: 'Spices & Condiments',
    slug: 'spices-condiments',
    description: 'Zanzibar and mainland spices for food service, households, and export-ready shops.',
    imageTokens: ['tanzania', 'spices', 'aroma'],
    brands: ['Zanzibar', 'Pemba', 'Mshikamano', 'Asili', 'Mambo'],
    labels: ['25g', '50g', '100g', '200g', '250g', '500g', '1kg', 'Ground', 'Whole'],
    priceBase: 1800,
    priceStep: 920,
    stockBase: 140,
    stockStep: 7,
    sellerIndex: 2,
    families: [
      { name: 'Cloves', slug: 'cloves', description: 'Aromatic cloves inspired by Zanzibar spice markets.', imageTokens: ['clove', 'spice'] },
      { name: 'Cardamom', slug: 'cardamom', description: 'Fragrant green cardamom for tea and dessert preparation.', imageTokens: ['cardamom', 'spice'] },
      { name: 'Curry Powder', slug: 'curry-powder', description: 'Balanced curry mixes for households and food vendors.', imageTokens: ['curry', 'spice'] }
    ]
  },
  {
    key: 'beauty',
    name: 'Beauty & Personal Care',
    slug: 'beauty-personal-care',
    description: 'Daily personal care products for salons, kiosks, and household buyers.',
    imageTokens: ['tanzania', 'beauty', 'care'],
    brands: ['Afya', 'Malkia', 'Nuru', 'Safi', 'Jasiri'],
    labels: ['30ml', '50ml', '100ml', '250ml', '500ml', '1L', 'Bar', 'Tube', 'Set'],
    priceBase: 1500,
    priceStep: 740,
    stockBase: 130,
    stockStep: 7,
    sellerIndex: 2,
    families: [
      { name: 'Shea Butter', slug: 'shea-butter', description: 'Moisturizing shea butter for skin and hair routines.', imageTokens: ['shea', 'butter'] },
      { name: 'Black Soap', slug: 'black-soap', description: 'Traditional black soap for body care and retail bundles.', imageTokens: ['soap', 'skincare'] },
      { name: 'Hair Oil', slug: 'hair-oil', description: 'Hair treatment oils popular with salons and home stylists.', imageTokens: ['hair', 'oil'] }
    ]
  },
  {
    key: 'fashion',
    name: 'Fashion & Textiles',
    slug: 'fashion-textiles',
    description: 'Kitenge, khanga, and leather goods from Tanzanian fashion hubs and workshops.',
    imageTokens: ['tanzania', 'textile', 'fabric'],
    brands: ['Vazi', 'Bahari', 'Ujamaa', 'Pamoja', 'Tembo'],
    labels: ['1 Yard', '2 Yards', '3 Yards', '5 Yards', 'Piece', 'Pair', 'Set', 'Roll', 'Bundle'],
    priceBase: 12000,
    priceStep: 1900,
    stockBase: 90,
    stockStep: 5,
    sellerIndex: 3,
    families: [
      { name: 'Kitenge Fabric', slug: 'kitenge-fabric', description: 'Bright patterned fabric for tailoring and streetwear.', imageTokens: ['kitenge', 'fabric'] },
      { name: 'Khanga Wrap', slug: 'khanga-wrap', description: 'Classic khanga wraps with Swahili-inspired styles.', imageTokens: ['khanga', 'wrap'] },
      { name: 'Leather Sandals', slug: 'leather-sandals', description: 'Comfortable leather sandals for casual and market use.', imageTokens: ['sandals', 'leather'] }
    ]
  },
  {
    key: 'home-kitchen',
    name: 'Home & Kitchen',
    slug: 'home-kitchen',
    description: 'Cooking tools, storage, and household essentials for Tanzanian homes and eateries.',
    imageTokens: ['tanzania', 'kitchen', 'home'],
    brands: ['Jikoni', 'Safi', 'Twiga', 'Imara', 'Mwangaza'],
    labels: ['250ml', '500ml', '1L', '2L', '4L', 'Set of 3', 'Set of 6', 'Pack', 'Bundle'],
    priceBase: 2500,
    priceStep: 980,
    stockBase: 110,
    stockStep: 6,
    sellerIndex: 1,
    families: [
      { name: 'Cookware Set', slug: 'cookware-set', description: 'Cooking pots, pans, and utensils for daily kitchen use.', imageTokens: ['cookware', 'kitchen'] },
      { name: 'Storage Containers', slug: 'storage-containers', description: 'Kitchen storage containers for dry goods and leftovers.', imageTokens: ['container', 'storage'] },
      { name: 'Cleaning Soap', slug: 'cleaning-soap', description: 'Household soap and cleaning supplies for everyday upkeep.', imageTokens: ['cleaning', 'soap'] }
    ]
  },
  {
    key: 'electronics',
    name: 'Electronics & Accessories',
    slug: 'electronics-accessories',
    description: 'Affordable power solutions, chargers, and consumer electronics for local retail.',
    imageTokens: ['tanzania', 'electronics', 'power'],
    brands: ['Jua', 'Umeme', 'Asha', 'Kijiji Tech', 'Twende'],
    labels: ['5W', '10W', '18W', '20W', '30W', '10000mAh', '20000mAh', 'USB-C', 'Solar'],
    priceBase: 8000,
    priceStep: 2900,
    stockBase: 60,
    stockStep: 4,
    sellerIndex: 4,
    families: [
      { name: 'Solar Lamp', slug: 'solar-lamp', description: 'Portable solar lamps for homes, kiosks, and rural traders.', imageTokens: ['solar', 'lamp'] },
      { name: 'Power Bank', slug: 'power-bank', description: 'Portable charging banks for busy commuters and traders.', imageTokens: ['power', 'bank'] },
      { name: 'Phone Charger', slug: 'phone-charger', description: 'Fast charging accessories for everyday phone use.', imageTokens: ['phone', 'charger'] }
    ]
  },
  {
    key: 'agriculture',
    name: 'Agriculture Inputs',
    slug: 'agriculture-inputs',
    description: 'Seeds, fertilizer, and tools for Tanzanian farmers and agro-dealers.',
    imageTokens: ['tanzania', 'agriculture', 'farm'],
    brands: ['Shamba', 'Mazao', 'Kilimo Bora', 'Twiga Agro', 'Mkulima'],
    labels: ['100g', '250g', '500g', '1kg', '5kg', '10kg', '25kg', 'Bag', 'Kit'],
    priceBase: 2200,
    priceStep: 1100,
    stockBase: 170,
    stockStep: 9,
    sellerIndex: 4,
    families: [
      { name: 'Vegetable Seeds', slug: 'vegetable-seeds', description: 'Vegetable seed packets for home gardens and farms.', imageTokens: ['seed', 'vegetable'] },
      { name: 'Fertilizer', slug: 'fertilizer', description: 'Crop nutrition inputs for medium and large scale growers.', imageTokens: ['fertilizer', 'farm'] },
      { name: 'Hand Tools', slug: 'hand-tools', description: 'Affordable hand tools for field work and garden maintenance.', imageTokens: ['tools', 'farm'] }
    ]
  },
  {
    key: 'building',
    name: 'Building, Mobility & Crafts',
    slug: 'building-mobility-crafts',
    description: 'Construction materials, mobility accessories, and artisan craft goods.',
    imageTokens: ['tanzania', 'building', 'craft'],
    brands: ['Mjenzi', 'Boma', 'Imara', 'Karibu', 'Sanaa'],
    labels: ['5kg', '10kg', '25kg', '50kg', '1m', '2m', 'Roll', 'Pair', 'Piece'],
    priceBase: 6500,
    priceStep: 2100,
    stockBase: 70,
    stockStep: 4,
    sellerIndex: 3,
    families: [
      { name: 'Cement', slug: 'cement', description: 'Construction cement for small jobs and larger builds.', imageTokens: ['cement', 'building'] },
      { name: 'Roofing Sheets', slug: 'roofing-sheets', description: 'Roofing sheets used by builders and hardware shops.', imageTokens: ['roofing', 'sheets'] },
      { name: 'Wood Carving', slug: 'wood-carving', description: 'Handmade Tanzanian carving pieces for shops and gift buyers.', imageTokens: ['wood', 'carving'] }
    ]
  }
];
