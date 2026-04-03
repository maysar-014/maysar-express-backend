const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const crypto = require('crypto');
const { pathToFileURL } = require('url');
const { PrismaClient } = require('@prisma/client');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const normalizeDatabaseUrl = (value) => {
  if (!value) return value;
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

const isTruthy = (value) => ['1', 'true', 'yes'].includes(String(value || '').toLowerCase());

const isLocalDatabaseUrl = (value) => {
  if (!value) return false;
  if (value.startsWith('file:')) return true;

  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'file:') return true;
    return ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  } catch {
    return false;
  }
};

const normalizedDatabaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
const allowUnsafeSeedTarget = isTruthy(process.env.CONTRACT_TEST_ALLOW_REMOTE_SEED);

const assertSafeSeedTarget = (databaseUrl) => {
  if (!databaseUrl) {
    console.error('Refusing to run contract seed: DATABASE_URL is not configured.');
    process.exit(1);
  }

  if (String(process.env.NODE_ENV || '').toLowerCase() === 'production' && !allowUnsafeSeedTarget) {
    console.error('Refusing to run contract seed against a production environment. Set CONTRACT_TEST_ALLOW_REMOTE_SEED=1 only if you intentionally want to override this safeguard.');
    process.exit(1);
  }

  if (!isLocalDatabaseUrl(databaseUrl) && !allowUnsafeSeedTarget) {
    console.error('Refusing to run contract seed against a non-local database. Set CONTRACT_TEST_ALLOW_REMOTE_SEED=1 only for an intentional remote test environment.');
    process.exit(1);
  }
};

assertSafeSeedTarget(normalizedDatabaseUrl);

const CONTRACT_USER_ID = process.env.CONTRACT_TEST_USER_ID || 'usr_test_0001';
const OPENAPI_USER_ID = process.env.CONTRACT_TEST_OPENAPI_USER_ID || 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const GENERIC_OBJECT_ID = process.env.CONTRACT_TEST_OBJECT_ID || 'obj_01ARZ3NDEKTSV4RRFFQ69G5FAV';

const CATEGORY_ID = process.env.CONTRACT_TEST_CATEGORY_ID || GENERIC_OBJECT_ID;
const CATEGORY_ATTRIBUTE_ID = process.env.CONTRACT_TEST_CATEGORY_ATTRIBUTE_ID || 'cat_attr_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const PRODUCT_ID = process.env.CONTRACT_TEST_PRODUCT_ID || 'cat_prd_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const PRODUCT_VARIANT_ID = process.env.CONTRACT_TEST_PRODUCT_VARIANT_ID || 'cat_var_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const BUY_BOX_ID = process.env.CONTRACT_TEST_BUY_BOX_ID || 'cat_buy_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const BUY_BOX_ALT_ID = process.env.CONTRACT_TEST_BUY_BOX_ALT_ID || 'cat_bba_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const ACTION_ITEM_ID = process.env.CONTRACT_TEST_ACTION_ITEM_ID || GENERIC_OBJECT_ID;
const ENABLER_ID = process.env.CONTRACT_TEST_ENABLER_ID || OPENAPI_USER_ID;
const ENABLER_LISTING_ID = process.env.CONTRACT_TEST_ENABLER_LISTING_ID || 'enb_lst_01ARZ3NDEKTSV4RRFFQ69G5FAV';

const BUSINESS_ID = process.env.CONTRACT_TEST_BUSINESS_ID || 'biz_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const BUSINESS_ADDRESS_ID = process.env.CONTRACT_TEST_BUSINESS_ADDRESS_ID || 'biz_addr_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const BUSINESS_DOCUMENT_ID = process.env.CONTRACT_TEST_BUSINESS_DOCUMENT_ID || 'biz_doc_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const BUSINESS_COMPLIANCE_ID = process.env.CONTRACT_TEST_BUSINESS_COMPLIANCE_ID || 'com_01ARZ3NDEKTSV4RRFFQ69G5FAV';

const ORDER_ID = process.env.CONTRACT_TEST_ORDER_ID || 'ord_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const ORDER_ITEM_ID = process.env.CONTRACT_TEST_ORDER_ITEM_ID || 'ord_item_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const ORDER_DISPUTE_ID = process.env.CONTRACT_TEST_ORDER_DISPUTE_ID || GENERIC_OBJECT_ID;
const TRACKING_NUMBER = process.env.CONTRACT_TEST_TRACKING_NUMBER || 'MYS-TZ-ORD-20260320-1A2B';

const PAYMENT_ID = process.env.CONTRACT_TEST_PAYMENT_ID || 'pay_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const PAYOUT_ID = process.env.CONTRACT_TEST_PAYOUT_ID || 'pyo_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const COMMISSION_ID = process.env.CONTRACT_TEST_COMMISSION_ID || GENERIC_OBJECT_ID;
const MATCH_CONFIRMATION_ID = process.env.CONTRACT_TEST_MATCH_CONFIRMATION_ID || GENERIC_OBJECT_ID;
const MATCH_AUDIT_ID = process.env.CONTRACT_TEST_MATCH_AUDIT_ID || 'cat_mta_01ARZ3NDEKTSV4RRFFQ69G5FAV';

const CHECKOUT_ID = process.env.CONTRACT_TEST_CHECKOUT_ID || GENERIC_OBJECT_ID;
const CHECKOUT_CART_ID = process.env.CONTRACT_TEST_CHECKOUT_CART_ID || 'chk_cart_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const GUEST_CHECKOUT_CART_ID = process.env.CONTRACT_TEST_GUEST_CHECKOUT_CART_ID || 'chk_cart_01ARZ3NDEKTSV4RRFFQ69G5FAA';
const CHECKOUT_ITEM_ID = process.env.CONTRACT_TEST_CHECKOUT_ITEM_ID || 'chk_item_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const GUEST_CHECKOUT_ITEM_ID = process.env.CONTRACT_TEST_GUEST_CHECKOUT_ITEM_ID || 'chk_item_01ARZ3NDEKTSV4RRFFQ69G5FAA';

const CONTRACT_WALLET_ID = process.env.CONTRACT_TEST_WALLET_ID || 'wal_contract_test_0001';
const OPENAPI_WALLET_ID = process.env.CONTRACT_TEST_OPENAPI_WALLET_ID || 'wal_contract_test_0002';
const WALLET_TRANSACTION_ID = process.env.CONTRACT_TEST_WALLET_TRANSACTION_ID || 'wal_tra_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const WALLET_HOLD_ID = process.env.CONTRACT_TEST_WALLET_HOLD_ID || 'wal_hol_01ARZ3NDEKTSV4RRFFQ69G5FAV';

const NOTIFICATION_TEMPLATE_ID = process.env.CONTRACT_TEST_NOTIFICATION_TEMPLATE_ID || GENERIC_OBJECT_ID;
const NOTIFICATION_ID = process.env.CONTRACT_TEST_NOTIFICATION_ID || GENERIC_OBJECT_ID;
const NOTIFICATION_PREFERENCE_ID = process.env.CONTRACT_TEST_NOTIFICATION_PREFERENCE_ID || 'ntf_pref_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const SMS_MESSAGE_ID = process.env.CONTRACT_TEST_SMS_MESSAGE_ID || GENERIC_OBJECT_ID;

const TRAINING_MODULE_ID = process.env.CONTRACT_TEST_TRAINING_MODULE_ID || 'trn_mod_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const TRAINING_RECORD_ID = process.env.CONTRACT_TEST_TRAINING_RECORD_ID || GENERIC_OBJECT_ID;

const SUPPORT_TICKET_ID = process.env.CONTRACT_TEST_SUPPORT_TICKET_ID || 'sup_tik_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const SUPPORT_DISPUTE_TICKET_ID = process.env.CONTRACT_TEST_SUPPORT_DISPUTE_TICKET_ID || 'sup_tik_dis_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const SUPPORT_AGENT_ID = process.env.CONTRACT_TEST_SUPPORT_AGENT_ID || GENERIC_OBJECT_ID;
const SUPPORT_MESSAGE_ID = process.env.CONTRACT_TEST_SUPPORT_MESSAGE_ID || 'sup_msg_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const SUPPORT_STATUS_HISTORY_ID = process.env.CONTRACT_TEST_SUPPORT_STATUS_HISTORY_ID || 'sup_hist_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const SUPPORT_DISPUTE_MESSAGE_ID = process.env.CONTRACT_TEST_SUPPORT_DISPUTE_MESSAGE_ID || 'sup_msg_dis_01ARZ3NDEKTSV4RRFFQ69G5FAV';

const CAMPAIGN_ID = process.env.CONTRACT_TEST_CAMPAIGN_ID || GENERIC_OBJECT_ID;
const CAMPAIGN_RULE_ID = process.env.CONTRACT_TEST_CAMPAIGN_RULE_ID || 'cmp_rule_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const CAMPAIGN_CATEGORY_ID = process.env.CONTRACT_TEST_CAMPAIGN_CATEGORY_LINK_ID || 'cmp_cat_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const CAMPAIGN_PRODUCT_ID = process.env.CONTRACT_TEST_CAMPAIGN_PRODUCT_LINK_ID || 'cmp_prd_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const CAMPAIGN_METRICS_ID = process.env.CONTRACT_TEST_CAMPAIGN_METRICS_ID || 'cmp_met_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const PROMOTION_JOB_ID = process.env.CONTRACT_TEST_PROMOTION_JOB_ID || 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const PROMOTION_JOB_RULE_ID = process.env.CONTRACT_TEST_PROMOTION_JOB_RULE_ID || 'cmp_prr_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const PROMOTION_JOB_CATEGORY_ID = process.env.CONTRACT_TEST_PROMOTION_JOB_CATEGORY_LINK_ID || 'cmp_pcg_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const PROMOTION_JOB_PRODUCT_ID = process.env.CONTRACT_TEST_PROMOTION_JOB_PRODUCT_LINK_ID || 'cmp_ppd_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const PROMOTION_JOB_METRICS_ID = process.env.CONTRACT_TEST_PROMOTION_JOB_METRICS_ID || 'cmp_pmt_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const PRODUCTION_PLAN_ID = process.env.CONTRACT_TEST_PRODUCTION_PLAN_ID || PRODUCT_ID;
const BULK_ORDER_REQUEST_ID = process.env.CONTRACT_TEST_BULK_ORDER_REQUEST_ID || 'prd_bulord_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const BULK_ORDER_QUOTE_ID = process.env.CONTRACT_TEST_BULK_ORDER_QUOTE_ID || 'prd_bulquo_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const CAPACITY_SNAPSHOT_ID = process.env.CONTRACT_TEST_CAPACITY_SNAPSHOT_ID || 'prd_capsna_01ARZ3NDEKTSV4RRFFQ69G5FAV';

const COMMUNITY_POST_ID = process.env.CONTRACT_TEST_COMMUNITY_POST_ID || GENERIC_OBJECT_ID;
const COMMUNITY_THREAD_ID = process.env.CONTRACT_TEST_COMMUNITY_THREAD_ID || GENERIC_OBJECT_ID;
const COMMUNITY_ANSWER_ID = process.env.CONTRACT_TEST_COMMUNITY_ANSWER_ID || 'cmt_ans_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const COMMUNITY_PROFILE_ID = process.env.CONTRACT_TEST_COMMUNITY_PROFILE_ID || 'cmt_prf_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const COMMUNITY_CONTRACT_PROFILE_ID = process.env.CONTRACT_TEST_COMMUNITY_CONTRACT_PROFILE_ID || 'cmt_prf_contract_0001';

const COURIER_ID = process.env.CONTRACT_TEST_COURIER_ID || OPENAPI_USER_ID;
const DELIVERY_ID = process.env.CONTRACT_TEST_DELIVERY_ID || GENERIC_OBJECT_ID;
const INVENTORY_WAREHOUSE_ID = process.env.CONTRACT_TEST_INVENTORY_WAREHOUSE_ID || 'inv_war_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const INVENTORY_STOCK_ITEM_ID = process.env.CONTRACT_TEST_INVENTORY_STOCK_ITEM_ID || 'inv_stk_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const ENABLER_ORDER_ID = process.env.CONTRACT_TEST_ENABLER_ORDER_ID || 'enb_ord_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const ENABLER_COMMISSION_LEDGER_ID = process.env.CONTRACT_TEST_ENABLER_COMMISSION_LEDGER_ID || 'enb_com_01ARZ3NDEKTSV4RRFFQ69G5FAV';

const AUTH_SESSION_ID = process.env.CONTRACT_TEST_AUTH_SESSION_ID || GENERIC_OBJECT_ID;
const AUTH_SESSION_TOKEN = process.env.CONTRACT_TEST_AUTH_SESSION_TOKEN || 'contract-auth-session-token';
const PASSWORD_RESET_TOKEN = process.env.CONTRACT_TEST_PASSWORD_RESET_TOKEN || 'token-example';
const PASSWORD_RESET_TOKEN_ID = process.env.CONTRACT_TEST_PASSWORD_RESET_TOKEN_ID || 'upr_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const EMAIL_VERIFICATION_TOKEN = process.env.CONTRACT_TEST_EMAIL_VERIFICATION_TOKEN || 'token-example';
const EMAIL_VERIFICATION_TOKEN_ID = process.env.CONTRACT_TEST_EMAIL_VERIFICATION_TOKEN_ID || 'uev_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const AUTH_PASSWORD_RESET_TOKEN_ID = process.env.CONTRACT_TEST_AUTH_PASSWORD_RESET_TOKEN_ID || 'apr_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const AUTH_EMAIL_VERIFICATION_TOKEN_ID = process.env.CONTRACT_TEST_AUTH_EMAIL_VERIFICATION_TOKEN_ID || 'aev_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const KYC_RECORD_ID = process.env.CONTRACT_TEST_KYC_RECORD_ID || 'kyc_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const KYC_SEED_STORAGE_KEY = 'seed/contract-kyc-document.pdf';

const CATEGORY_SLUG = `contract-test-category-${CATEGORY_ID.slice(-8).toLowerCase()}`;
const PRODUCT_SLUG = `contract-test-product-${PRODUCT_ID.slice(-8).toLowerCase()}`;
const PRODUCT_SKU = `CT-${PRODUCT_VARIANT_ID.replace(/[^A-Za-z0-9]/g, '').slice(-10).toUpperCase()}`;
const ENABLER_CODE_SUFFIX = ENABLER_ID.replace(/[^A-Za-z0-9]/g, '').slice(-6).toUpperCase().padStart(6, 'A');
const ENABLER_CODE = `ENB-${ENABLER_CODE_SUFFIX}`;
const ENABLER_CODE_SHORT = `E${ENABLER_CODE_SUFFIX}`;
const TEMPLATE_NAME = `contract-template-${NOTIFICATION_TEMPLATE_ID.slice(-8).toLowerCase()}`;
const COMMUNITY_USERNAME = `contract_${OPENAPI_USER_ID.slice(-8).toLowerCase()}`;
const CONTRACT_CHALLENGE_TITLE = 'How can we reduce failed doorstep deliveries in dense city zones?';
const CONTRACT_KNOWLEDGE_ARTICLE_TITLE = 'Reducing failed deliveries with earlier buyer confirmation';
const rootDir = path.join(__dirname, '..', '..');
const kycUploadDestination = path.resolve(
  process.env.KYC_DOCUMENT_UPLOAD_DESTINATION
    || process.env.UPLOAD_DESTINATION
    || path.join(rootDir, 'uploads', 'kyc')
);
const kycSeedFilePath = path.join(kycUploadDestination, KYC_SEED_STORAGE_KEY);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: normalizedDatabaseUrl
    }
  }
});

const futureDate = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);
const normalizeDayUtc = (value = new Date()) =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
const ensureSeedFile = (absolutePath, contents) => {
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents);
};

const buildSeededKycDocumentPayload = () => {
  const fileBuffer = Buffer.from('%PDF-1.4\n% Contract test KYC document\n');
  ensureSeedFile(kycSeedFilePath, fileBuffer);

  return {
    type: 'national_id',
    url: pathToFileURL(kycSeedFilePath).toString(),
    fileName: path.basename(kycSeedFilePath),
    mimeType: 'application/pdf',
    fileSizeBytes: fileBuffer.length,
    storageProvider: 'local',
    storageKey: KYC_SEED_STORAGE_KEY.replace(/\\/g, '/'),
    checksumSha256: crypto.createHash('sha256').update(fileBuffer).digest('hex'),
    uploadedAt: new Date().toISOString(),
    status: 'approved'
  };
};

const upsertById = async (delegate, id, data) => {
  await delegate.upsert({
    where: { id },
    update: data,
    create: { id, ...data }
  });
};

const upsertOptionalById = async (delegate, id, data) => {
  if (!delegate || typeof delegate.upsert !== 'function') {
    return;
  }
  await upsertById(delegate, id, data);
};

const upsertCheckoutCartItem = async (id, data) => {
  await prisma.checkout_CartItem.upsert({
    where: {
      cartId_productId_variantId: {
        cartId: data.cartId,
        productId: data.productId,
        variantId: data.variantId ?? null
      }
    },
    update: {
      id,
      quantity: data.quantity,
      priceAtTime: data.priceAtTime
    },
    create: {
      id,
      ...data,
      variantId: data.variantId ?? null
    }
  });
};

const upsertAuthUser = async (id, role, email, phoneNumber) => {
  await prisma.user.upsert({
    where: { id },
    update: {
      email,
      phoneNumber,
      passwordHash: 'contract-test-hash',
      role,
      status: 'ACTIVE',
      isEmailVerified: true,
      isPhoneVerified: true
    },
    create: {
      id,
      email,
      phoneNumber,
      passwordHash: 'contract-test-hash',
      role,
      status: 'ACTIVE',
      isEmailVerified: true,
      isPhoneVerified: true
    }
  });

  await prisma.auth_User.upsert({
    where: { id },
    update: { email, passwordHash: 'contract-test-hash', role, status: 'ACTIVE', twoFactorEnabled: false },
    create: { id, email, passwordHash: 'contract-test-hash', role, status: 'ACTIVE', twoFactorEnabled: false }
  });
};

const upsertUser = async (id, role, email, phoneNumber) => {
  await prisma.user_User.upsert({
    where: { id },
    update: {
      email,
      phoneNumber,
      firstName: 'Contract',
      lastName: 'User',
      passwordHash: 'contract-test-hash',
      role,
      status: 'ACTIVE',
      isEmailVerified: true,
      isPhoneVerified: true,
      timezone: 'Africa/Dar_es_Salaam',
      language: 'en'
    },
    create: {
      id,
      email,
      phoneNumber,
      firstName: 'Contract',
      lastName: 'User',
      passwordHash: 'contract-test-hash',
      role,
      status: 'ACTIVE',
      isEmailVerified: true,
      isPhoneVerified: true,
      timezone: 'Africa/Dar_es_Salaam',
      language: 'en'
    }
  });
};

const upsertWallet = async (id, userId, balance) => {
  await prisma.wallet_Wallet.upsert({
    where: { id },
    update: { userId, balance, frozenAmount: 0, currency: 'TZS', status: 'ACTIVE', metadata: { source: 'contract-test-seed' } },
    create: { id, userId, balance, frozenAmount: 0, currency: 'TZS', status: 'ACTIVE', metadata: { source: 'contract-test-seed' } }
  });

  await prisma.wallet_Wallet.updateMany({
    where: { userId },
    data: {
      balance,
      frozenAmount: 0,
      currency: 'TZS',
      status: 'ACTIVE',
      metadata: { source: 'contract-test-seed' }
    }
  });
};

const upsertCategory = async () => {
  await prisma.category.upsert({
    where: { id: CATEGORY_ID },
    update: { name: 'Contract Test Category', slug: CATEGORY_SLUG, description: 'Seeded for contract tests', isActive: true, displayOrder: 0 },
    create: { id: CATEGORY_ID, name: 'Contract Test Category', slug: CATEGORY_SLUG, description: 'Seeded for contract tests', isActive: true, displayOrder: 0 }
  });

  await prisma.categoryAttribute.upsert({
    where: { id: CATEGORY_ATTRIBUTE_ID },
    update: { categoryId: CATEGORY_ID, name: 'memory', displayLabel: 'Memory', type: 'TEXT', isRequired: false, displayOrder: 0, placeholder: '128GB' },
    create: { id: CATEGORY_ATTRIBUTE_ID, categoryId: CATEGORY_ID, name: 'memory', displayLabel: 'Memory', type: 'TEXT', isRequired: false, displayOrder: 0, placeholder: '128GB' }
  });
};

const upsertProduct = async () => {
  await prisma.product.upsert({
    where: { id: PRODUCT_ID },
    update: {
      sellerId: OPENAPI_USER_ID,
      title: 'Contract Test Product',
      description: 'Seeded product used by OpenAPI examples',
      categoryId: CATEGORY_ID,
      brand: 'Contract Brand',
      model: 'CT-1',
      status: 'published',
      visibility: 'public',
      slug: PRODUCT_SLUG,
      tags: ['contract-test'],
      qualityScore: 90
    },
    create: {
      id: PRODUCT_ID,
      sellerId: OPENAPI_USER_ID,
      title: 'Contract Test Product',
      description: 'Seeded product used by OpenAPI examples',
      categoryId: CATEGORY_ID,
      brand: 'Contract Brand',
      model: 'CT-1',
      status: 'published',
      visibility: 'public',
      slug: PRODUCT_SLUG,
      tags: ['contract-test'],
      qualityScore: 90
    }
  });

  await prisma.productVariant.upsert({
    where: { id: PRODUCT_VARIANT_ID },
    update: { productId: PRODUCT_ID, sku: PRODUCT_SKU, name: 'Contract Test Product Variant', price: 1000, status: 'active', attributes: { color: 'black', memory: '128GB' } },
    create: { id: PRODUCT_VARIANT_ID, productId: PRODUCT_ID, sku: PRODUCT_SKU, name: 'Contract Test Product Variant', price: 1000, status: 'active', attributes: { color: 'black', memory: '128GB' } }
  });
};

const upsertBuyBox = async () => {
  await prisma.buyBox.upsert({
    where: { productId: PRODUCT_ID },
    update: { id: BUY_BOX_ID, primarySellerId: OPENAPI_USER_ID, primaryScore: 97.5, lastComputedAt: new Date() },
    create: { id: BUY_BOX_ID, productId: PRODUCT_ID, primarySellerId: OPENAPI_USER_ID, primaryScore: 97.5, lastComputedAt: new Date() }
  });

  await prisma.catalog_BuyBoxAlternative.upsert({
    where: { id: BUY_BOX_ALT_ID },
    update: { buyBoxId: BUY_BOX_ID, sellerId: CONTRACT_USER_ID, score: 88.25, rank: 2 },
    create: { id: BUY_BOX_ALT_ID, buyBoxId: BUY_BOX_ID, sellerId: CONTRACT_USER_ID, score: 88.25, rank: 2 }
  });
};

const upsertAnalyticsSellerRecords = async () => {
  await prisma.analytics_SellerMetrics.upsert({
    where: { sellerId: OPENAPI_USER_ID },
    update: { profitabilityScore: 68, averageOrderValue: 12500, conversionRate: 4.2, responseRate: 95 },
    create: { sellerId: OPENAPI_USER_ID, profitabilityScore: 68, averageOrderValue: 12500, conversionRate: 4.2, responseRate: 95 }
  });

  await prisma.analytics_SellerActionItem.upsert({
    where: { id: ACTION_ITEM_ID },
    update: { sellerId: OPENAPI_USER_ID, type: 'inventory', priority: 'high', title: 'Review contract inventory', description: 'Seeded action item for contract tests', isResolved: false },
    create: { id: ACTION_ITEM_ID, sellerId: OPENAPI_USER_ID, type: 'inventory', priority: 'high', title: 'Review contract inventory', description: 'Seeded action item for contract tests', isResolved: false }
  });
};

const upsertEnablerProfile = async () => {
  await prisma.enabler_Profile.upsert({
    where: { id: ENABLER_ID },
    update: {
      userId: CONTRACT_USER_ID,
      enablerCode: ENABLER_CODE,
      enablerCodeShort: ENABLER_CODE_SHORT,
      businessName: 'Contract Test Enabler',
      contactEmail: 'enabler.contract@example.com',
      contactPhone: '+255700000111',
      businessDescription: 'Seeded enabler profile for contract tests',
      status: 'ACTIVE',
      verificationStatus: 'verified',
      tier: 'GOLD',
      commissionRate: 0.05,
      totalSales: 0,
      totalOrders: 0,
      conversionRate: 0,
      totalCommissionEarned: 0
    },
    create: {
      id: ENABLER_ID,
      userId: CONTRACT_USER_ID,
      enablerCode: ENABLER_CODE,
      enablerCodeShort: ENABLER_CODE_SHORT,
      businessName: 'Contract Test Enabler',
      contactEmail: 'enabler.contract@example.com',
      contactPhone: '+255700000111',
      businessDescription: 'Seeded enabler profile for contract tests',
      status: 'ACTIVE',
      verificationStatus: 'verified',
      tier: 'GOLD',
      commissionRate: 0.05,
      totalSales: 0,
      totalOrders: 0,
      conversionRate: 0,
      totalCommissionEarned: 0
    }
  });

  await prisma.enabler_ProductListing.upsert({
    where: { id: ENABLER_LISTING_ID },
    update: { enablerId: ENABLER_ID, productId: PRODUCT_ID, sellerId: OPENAPI_USER_ID, status: 'ACTIVE', visibility: true, sellerApproved: true, views: 0, clicks: 0, orders: 0, revenue: 0 },
    create: { id: ENABLER_LISTING_ID, enablerId: ENABLER_ID, productId: PRODUCT_ID, sellerId: OPENAPI_USER_ID, status: 'ACTIVE', visibility: true, sellerApproved: true, views: 0, clicks: 0, orders: 0, revenue: 0 }
  });
};

const upsertBusinessRegistryRecords = async () => {
  const taxDigits = BUSINESS_ID.replace(/\D/g, '').slice(-8).padStart(8, '0');
  const taxId = `9${taxDigits}`;
  const registrationDigits = BUSINESS_ID.replace(/\D/g, '').slice(-6).padStart(6, '0');
  const registrationNumber = `TZ-DAR-${registrationDigits}`;

  const conflictingBusinesses = await prisma.business.findMany({
    where: {
      registrationNumber,
      NOT: { id: BUSINESS_ID }
    },
    select: { id: true }
  });

  for (const { id } of conflictingBusinesses) {
    await prisma.businessRegistry_ComplianceRecord.deleteMany({ where: { businessId: id } });
    await prisma.businessDocument.deleteMany({ where: { businessId: id } });
    await prisma.businessAddress.deleteMany({ where: { businessId: id } });
    await prisma.business.deleteMany({ where: { id } });
  }

  await prisma.business.upsert({
    where: { id: BUSINESS_ID },
    update: {
      name: 'Contract Test Business',
      businessType: 'SOLE_PROPRIETORSHIP',
      registrationNumber,
      taxId,
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      complianceStatus: 'COMPLIANT',
      ownerId: OPENAPI_USER_ID,
      description: 'Seeded business for contract tests',
      industry: ['Commerce'],
      website: 'https://example.com/contract-business',
      email: 'business.contract@example.com',
      phoneNumber: '+255700000120'
    },
    create: {
      id: BUSINESS_ID,
      name: 'Contract Test Business',
      businessType: 'SOLE_PROPRIETORSHIP',
      registrationNumber,
      taxId,
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      complianceStatus: 'COMPLIANT',
      ownerId: OPENAPI_USER_ID,
      description: 'Seeded business for contract tests',
      industry: ['Commerce'],
      website: 'https://example.com/contract-business',
      email: 'business.contract@example.com',
      phoneNumber: '+255700000120'
    }
  });

  await upsertById(prisma.businessAddress, BUSINESS_ADDRESS_ID, { businessId: BUSINESS_ID, type: 'MAIN', street: 'Ohio Street', city: 'Dar es Salaam', region: 'Dar es Salaam', postalCode: '11101', country: 'Tanzania', isPrimary: true });
  await upsertById(prisma.businessRegistry_ComplianceRecord, BUSINESS_COMPLIANCE_ID, { businessId: BUSINESS_ID, type: 'TAX_COMPLIANCE', status: 'COMPLIANT', checkedAt: new Date(), expiresAt: futureDate(180), notes: 'Seeded compliance record for contract tests' });
  await upsertById(prisma.businessDocument, BUSINESS_DOCUMENT_ID, { businessId: BUSINESS_ID, type: 'REGISTRATION_CERTIFICATE', fileName: 'contract-registration.pdf', fileUrl: 'https://example.com/files/contract-registration.pdf', status: 'APPROVED', uploadedAt: new Date(), verifiedAt: new Date() });
};

const upsertOrderRecords = async () => {
  await prisma.order_Order.upsert({
    where: { id: ORDER_ID },
    update: {
      trackingNumber: TRACKING_NUMBER,
      buyerId: CONTRACT_USER_ID,
      sellerId: OPENAPI_USER_ID,
      enablerId: ENABLER_ID,
      enablerCode: ENABLER_CODE,
      status: 'PENDING',
      paymentMethod: 'MOBILE_MONEY',
      totalAmount: 1000,
      currency: 'TZS',
      totalWeight: 1,
      deliveryAddress: { street: 'Uhuru Street', city: 'Dar es Salaam', postalCode: '11101', country: 'TZ' }
    },
    create: {
      id: ORDER_ID,
      trackingNumber: TRACKING_NUMBER,
      buyerId: CONTRACT_USER_ID,
      sellerId: OPENAPI_USER_ID,
      enablerId: ENABLER_ID,
      enablerCode: ENABLER_CODE,
      status: 'PENDING',
      paymentMethod: 'MOBILE_MONEY',
      totalAmount: 1000,
      currency: 'TZS',
      totalWeight: 1,
      deliveryAddress: { street: 'Uhuru Street', city: 'Dar es Salaam', postalCode: '11101', country: 'TZ' }
    }
  });

  await upsertById(prisma.order_OrderItem, ORDER_ITEM_ID, { orderId: ORDER_ID, productId: PRODUCT_ID, quantity: 1, price: 1000, weight: 1, currency: 'TZS' });
  await upsertById(prisma.order_CODDispute, ORDER_DISPUTE_ID, { orderId: ORDER_ID, disputeType: 'DELIVERY', raisedBy: CONTRACT_USER_ID, description: 'Seeded dispute for contract tests', status: 'PENDING' });
};

const upsertPaymentAndPayoutRecords = async () => {
  await prisma.payment_Payment.upsert({
    where: { id: PAYMENT_ID },
    update: { orderId: ORDER_ID, userId: CONTRACT_USER_ID, amount: 1000, currency: 'TZS', method: 'MPESA', provider: 'PESAPAL', status: 'COMPLETED', description: 'Seeded payment for contract tests', metadata: { source: 'contract-test-seed', providerReference: PAYMENT_ID, providerTransactionId: 'txn_contract_seed_payment' }, completedAt: new Date(), refundedAmount: 0 },
    create: { id: PAYMENT_ID, orderId: ORDER_ID, userId: CONTRACT_USER_ID, amount: 1000, currency: 'TZS', method: 'MPESA', provider: 'PESAPAL', status: 'COMPLETED', description: 'Seeded payment for contract tests', metadata: { source: 'contract-test-seed', providerReference: PAYMENT_ID, providerTransactionId: 'txn_contract_seed_payment' }, completedAt: new Date(), refundedAmount: 0 }
  });

  await prisma.payment_Payment.upsert({
    where: { id: 'pay_ord_lookup_01ARZ3NDEKTSV4RRFFQ69G5FAV' },
    update: { orderId: PAYMENT_ID, userId: CONTRACT_USER_ID, amount: 1000, currency: 'TZS', method: 'MPESA', provider: 'PESAPAL', status: 'COMPLETED', description: 'Seeded payment lookup-by-order fixture', metadata: { source: 'contract-test-seed', providerReference: 'pay_ord_lookup_01ARZ3NDEKTSV4RRFFQ69G5FAV', providerTransactionId: 'txn_contract_seed_lookup' }, completedAt: new Date(), refundedAmount: 0 },
    create: { id: 'pay_ord_lookup_01ARZ3NDEKTSV4RRFFQ69G5FAV', orderId: PAYMENT_ID, userId: CONTRACT_USER_ID, amount: 1000, currency: 'TZS', method: 'MPESA', provider: 'PESAPAL', status: 'COMPLETED', description: 'Seeded payment lookup-by-order fixture', metadata: { source: 'contract-test-seed', providerReference: 'pay_ord_lookup_01ARZ3NDEKTSV4RRFFQ69G5FAV', providerTransactionId: 'txn_contract_seed_lookup' }, completedAt: new Date(), refundedAmount: 0 }
  });

  await prisma.payout.upsert({
    where: { id: PAYOUT_ID },
    update: { userId: OPENAPI_USER_ID, userRole: 'seller', amount: 750, currency: 'TZS', method: 'MOBILE_MONEY', status: 'PENDING', mobileMoneyDetails: { provider: 'MPESA', phoneNumber: '+255712345678' }, reference: 'contract-payout-001', fee: 25, netAmount: 725, metadata: { source: 'contract-test-seed' } },
    create: { id: PAYOUT_ID, userId: OPENAPI_USER_ID, userRole: 'seller', amount: 750, currency: 'TZS', method: 'MOBILE_MONEY', status: 'PENDING', mobileMoneyDetails: { provider: 'MPESA', phoneNumber: '+255712345678' }, reference: 'contract-payout-001', fee: 25, netAmount: 725, metadata: { source: 'contract-test-seed' } }
  });
};

const upsertCheckoutAndCommissionRecords = async () => {
  await upsertById(prisma.checkout_Cart, CHECKOUT_CART_ID, { userId: CONTRACT_USER_ID, status: 'active' });
  await upsertCheckoutCartItem(CHECKOUT_ITEM_ID, { cartId: CHECKOUT_CART_ID, productId: PRODUCT_ID, variantId: PRODUCT_VARIANT_ID, quantity: 1, priceAtTime: 1000 });
  await upsertById(prisma.checkout_Cart, GUEST_CHECKOUT_CART_ID, { userId: CONTRACT_USER_ID, status: 'active' });
  await upsertCheckoutCartItem(GUEST_CHECKOUT_ITEM_ID, { cartId: GUEST_CHECKOUT_CART_ID, productId: PRODUCT_ID, variantId: PRODUCT_VARIANT_ID, quantity: 1, priceAtTime: 1000 });
  await upsertById(prisma.checkout_CheckoutSession, CHECKOUT_ID, { cartId: CHECKOUT_CART_ID, userId: CONTRACT_USER_ID, enablerId: ENABLER_ID, enablerCode: ENABLER_CODE, status: 'initiated', subtotal: 1000, shippingCost: 100, taxAmount: 0, discountAmount: 0, totalAmount: 1100, paymentStatus: 'pending', metadata: { items: [{ productId: PRODUCT_ID, variantId: PRODUCT_VARIANT_ID, quantity: 1, unitPrice: 1000 }] }, expiresAt: futureDate(1) });
  await upsertById(prisma.commission, COMMISSION_ID, { orderId: ORDER_ID, sellerId: OPENAPI_USER_ID, amount: 50, rate: 0.05, type: 'sale', status: 'pending', payoutId: PAYOUT_ID, metadata: { source: 'contract-test-seed' } });
  await upsertById(prisma.commission, BUSINESS_COMPLIANCE_ID, { orderId: ORDER_ID, sellerId: OPENAPI_USER_ID, amount: 50, rate: 0.05, type: 'sale', status: 'pending', payoutId: PAYOUT_ID, metadata: { source: 'contract-test-seed', exampleId: 'commission-approve' } });
  await upsertById(prisma.enabler_Order, ENABLER_ORDER_ID, {
    enablerId: ENABLER_ID,
    orderId: ORDER_ID,
    sellerId: OPENAPI_USER_ID,
    buyerId: CONTRACT_USER_ID,
    productListingId: ENABLER_LISTING_ID,
    status: 'COMPLETED',
    orderAmount: 1000,
    productAmount: 950,
    enablerCommission: 50,
    platformFee: 0,
    commissionRate: 0.05,
    tierBonus: 0,
    performanceBonus: 0,
    settlementStatus: 'paid',
    disputeStatus: 'none',
    metadata: { source: 'contract-test-seed' }
  });
  await upsertById(prisma.enabler_Commission, ENABLER_COMMISSION_LEDGER_ID, {
    enablerId: ENABLER_ID,
    enablerOrderId: ENABLER_ORDER_ID,
    commissionId: COMMISSION_ID,
    baseCommission: 50,
    tierBonus: 0,
    performanceBonus: 0,
    totalCommission: 50,
    status: 'paid',
    protectionStatus: 'protected',
    fraudCheckStatus: 'clear',
    payoutId: PAYOUT_ID,
    paidAt: new Date(),
    paymentMethod: 'MOBILE_MONEY',
    calculationDetails: { source: 'contract-test-seed' },
    metadata: { source: 'contract-test-seed' }
  });
};

const upsertCatalogMatchingRecords = async () => {
  await upsertOptionalById(prisma.catalog_ProductMatchAudit, MATCH_AUDIT_ID, {
    candidateProductId: PRODUCT_ID,
    matchedProductId: PRODUCT_ID,
    matchLevel: 'EXACT',
    matchScore: 0.98,
    matchingCriteria: {
      brand: 'Contract Brand',
      model: 'CT-1',
      categoryId: CATEGORY_ID
    },
    decision: 'NEW_PRODUCT',
    decidedBy: 'SYSTEM',
    sellerId: OPENAPI_USER_ID,
    metadata: { source: 'contract-test-seed' },
    createdAt: new Date()
  });

  await upsertOptionalById(prisma.catalog_MatchConfirmation, MATCH_CONFIRMATION_ID, {
    auditId: MATCH_AUDIT_ID,
    sellerId: OPENAPI_USER_ID,
    candidateProducts: [{ id: PRODUCT_ID, title: 'Contract Test Product' }],
    status: 'PENDING',
    sellerChoice: null,
    expiresAt: futureDate(7),
    respondedAt: null,
    createdAt: new Date()
  });
};

const upsertNotificationRecords = async () => {
  await prisma.notificationTemplate.upsert({
    where: { id: NOTIFICATION_TEMPLATE_ID },
    update: { name: TEMPLATE_NAME, type: 'email', subject: 'Contract test notification', content: 'Hello {{name}}, this is a seeded contract-test notification.', variables: ['name'], locale: 'en', status: 'active', createdBy: CONTRACT_USER_ID },
    create: { id: NOTIFICATION_TEMPLATE_ID, name: TEMPLATE_NAME, type: 'email', subject: 'Contract test notification', content: 'Hello {{name}}, this is a seeded contract-test notification.', variables: ['name'], locale: 'en', status: 'active', createdBy: CONTRACT_USER_ID }
  });

  await prisma.notification.upsert({
    where: { id: NOTIFICATION_ID },
    update: { userId: OPENAPI_USER_ID, templateId: NOTIFICATION_TEMPLATE_ID, type: 'email', priority: 'normal', subject: 'Contract test notification', content: 'Seeded notification for contract tests', data: { source: 'contract-test-seed' }, status: 'pending', metadata: { source: 'contract-test-seed' } },
    create: { id: NOTIFICATION_ID, userId: OPENAPI_USER_ID, templateId: NOTIFICATION_TEMPLATE_ID, type: 'email', priority: 'normal', subject: 'Contract test notification', content: 'Seeded notification for contract tests', data: { source: 'contract-test-seed' }, status: 'pending', metadata: { source: 'contract-test-seed' } }
  });

  const preferenceDelegate = prisma.notificationPreference || prisma.notification_Preference || prisma.preference;
  await upsertOptionalById(preferenceDelegate, NOTIFICATION_PREFERENCE_ID, {
    userId: OPENAPI_USER_ID,
    channel: 'email',
    enabled: true,
    categories: { marketing: true, transactional: true, system: true },
    quietHours: null,
    frequency: 'realtime'
  });

  await upsertById(prisma.sms_Message, SMS_MESSAGE_ID, { phoneNumber: '+255712345678', content: 'Seeded SMS message for contract tests', status: 'FAILED', providerMessageId: 'contract-sms-001', userId: OPENAPI_USER_ID, metadata: { source: 'contract-test-seed' } });
};

const upsertTrainingRecords = async () => {
  await upsertById(prisma.training_TrainingModule, TRAINING_MODULE_ID, { name: 'Contract Test Training Module', description: 'Seeded training module for contract tests', contentType: 'TEXT', content: { sections: ['Introduction', 'Checklist'] }, durationMinutes: 5, category: 'general', prerequisites: [], targetRoles: ['buyer', 'seller', 'agent', 'admin'], isPublic: true, difficulty: 'BEGINNER' });
  await prisma.training_CertificationRequirement.upsert({
    where: { module: TRAINING_MODULE_ID },
    update: { minimumScore: 60, validityPeriodDays: 365, mandatory: false, maxAttempts: 3 },
    create: { module: TRAINING_MODULE_ID, minimumScore: 60, validityPeriodDays: 365, mandatory: false, maxAttempts: 3 }
  });
  await upsertById(prisma.training_TrainingRecord, TRAINING_RECORD_ID, { learnerId: OPENAPI_USER_ID, learnerRole: 'seller', moduleId: TRAINING_MODULE_ID, status: 'IN_PROGRESS', startedAt: new Date(), attempts: 1, progress: { percent: 50 }, expiresAt: futureDate(365) });
};

const upsertSupportRecords = async () => {
  await upsertById(prisma.support_SupportAgent, SUPPORT_AGENT_ID, { userId: CONTRACT_USER_ID, specializations: ['GENERAL', 'ORDERS'], maxConcurrentTickets: 5, currentTicketCount: 1, isAvailable: true, totalTicketsResolved: 0 });
  await upsertById(prisma.support_Ticket, SUPPORT_TICKET_ID, { subject: 'Contract Test Support Ticket', description: 'Auto-seeded for contract testing', status: 'OPEN', priority: 'MEDIUM', category: 'GENERAL', userId: OPENAPI_USER_ID, assignedAgentId: SUPPORT_AGENT_ID });
  await upsertById(prisma.support_Ticket, SUPPORT_DISPUTE_TICKET_ID, {
    subject: 'Order dispute for seeded contract order',
    description: `Order ID: ${ORDER_ID}\nReason: Delivery issue\n\nSeeded dispute ticket for contract tests`,
    status: 'OPEN',
    priority: 'HIGH',
    category: 'order_dispute',
    userId: OPENAPI_USER_ID,
    assignedAgentId: SUPPORT_AGENT_ID
  });
  await upsertById(prisma.support_TicketMessage, SUPPORT_MESSAGE_ID, { ticketId: SUPPORT_TICKET_ID, senderId: CONTRACT_USER_ID, senderType: 'AGENT', content: 'Seeded support reply for contract tests', isInternal: false });
  await upsertById(prisma.support_TicketMessage, SUPPORT_DISPUTE_MESSAGE_ID, { ticketId: SUPPORT_DISPUTE_TICKET_ID, senderId: OPENAPI_USER_ID, senderType: 'USER', content: 'Seeded dispute evidence note for contract tests', isInternal: false });
  await upsertById(prisma.support_TicketStatusHistory, SUPPORT_STATUS_HISTORY_ID, { ticketId: SUPPORT_TICKET_ID, fromStatus: 'OPEN', toStatus: 'IN_PROGRESS', changedBy: CONTRACT_USER_ID, reason: 'Seeded transition for contract tests' });
};

const upsertInventoryRecords = async () => {
  await upsertById(prisma.Inventory_Warehouse || prisma.inventory_Warehouse, INVENTORY_WAREHOUSE_ID, {
    code: 'CT-WH-01',
    name: 'Contract Test Warehouse',
    address: {
      street: 'Nyerere Road',
      city: 'Dar es Salaam',
      region: 'Dar es Salaam',
      country: 'TZ'
    },
    type: 'central',
    status: 'active',
    capacity: {
      unit: 'units',
      max: 50000
    },
    operatingHours: {
      timezone: 'Africa/Dar_es_Salaam',
      weekdays: '08:00-18:00'
    }
  });

  await upsertById(prisma.Inventory_StockItem || prisma.inventory_StockItem, INVENTORY_STOCK_ITEM_ID, {
    productVariantId: PRODUCT_VARIANT_ID,
    warehouseId: INVENTORY_WAREHOUSE_ID,
    sku: PRODUCT_SKU,
    quantityAvailable: 125,
    quantityReserved: 5,
    quantityDamaged: 0,
    quantityOnOrder: 20,
    reorderPoint: 20,
    maxStock: 500,
    unitCost: 750,
    status: 'active',
    metadata: { source: 'contract-test-seed' }
  });
};

const upsertCampaignRecords = async () => {
  await upsertById(prisma.campaign_Campaign, CAMPAIGN_ID, { name: 'Contract Test Campaign', description: 'Seeded campaign for contract tests', type: 'DISCOUNT', status: 'ACTIVE', startDate: new Date(Date.now() - 60 * 60 * 1000), endDate: futureDate(7), timezone: 'Africa/Dar_es_Salaam', autoApply: true, autoRevert: true, sellerId: OPENAPI_USER_ID, createdBy: CONTRACT_USER_ID, metadata: { source: 'contract-test-seed' } });
  await upsertById(prisma.campaign_PricingRule, CAMPAIGN_RULE_ID, { campaignId: CAMPAIGN_ID, ruleType: 'FIXED_DISCOUNT', value: 100, priority: 1, conditions: { minQuantity: 1 } });
  await prisma.campaign_Category.upsert({
    where: { campaignId_categoryId: { campaignId: CAMPAIGN_ID, categoryId: CATEGORY_ID } },
    update: { id: CAMPAIGN_CATEGORY_ID },
    create: { id: CAMPAIGN_CATEGORY_ID, campaignId: CAMPAIGN_ID, categoryId: CATEGORY_ID }
  });
  await prisma.campaign_Product.upsert({
    where: { campaignId_productId: { campaignId: CAMPAIGN_ID, productId: PRODUCT_ID } },
    update: { id: CAMPAIGN_PRODUCT_ID, originalPrice: { amount: 1000, currency: 'TZS' }, campaignPrice: { amount: 900, currency: 'TZS' }, appliedAt: new Date() },
    create: { id: CAMPAIGN_PRODUCT_ID, campaignId: CAMPAIGN_ID, productId: PRODUCT_ID, originalPrice: { amount: 1000, currency: 'TZS' }, campaignPrice: { amount: 900, currency: 'TZS' }, appliedAt: new Date() }
  });
  await upsertById(prisma.campaign_Metrics, CAMPAIGN_METRICS_ID, { campaignId: CAMPAIGN_ID, views: 10, conversions: 1, revenue: 900, totalProductsAffected: 1, totalRevenueImpact: 100, averageDiscountPercent: 10 });

  await upsertById(prisma.campaign_Campaign, PROMOTION_JOB_ID, {
    name: 'Ramadan Promotion Boost',
    description: 'Help drive seasonal sales for featured marketplace products.',
    type: 'PROMOTION',
    status: 'ACTIVE',
    startDate: new Date(Date.now() - 60 * 60 * 1000),
    endDate: futureDate(7),
    timezone: 'Africa/Dar_es_Salaam',
    autoApply: false,
    autoRevert: false,
    sellerId: OPENAPI_USER_ID,
    createdBy: CONTRACT_USER_ID,
    metadata: {
      source: 'contract-test-seed',
      brief: 'Promote seasonal marketplace offers across your referral channels.',
      channels: ['marketplace', 'social'],
      rewardEstimate: 25000
    }
  });
  await upsertById(prisma.campaign_PricingRule, PROMOTION_JOB_RULE_ID, {
    campaignId: PROMOTION_JOB_ID,
    ruleType: 'FIXED_DISCOUNT',
    value: 100,
    priority: 1,
    conditions: { minQuantity: 1 }
  });
  await prisma.campaign_Category.upsert({
    where: { campaignId_categoryId: { campaignId: PROMOTION_JOB_ID, categoryId: CATEGORY_ID } },
    update: { id: PROMOTION_JOB_CATEGORY_ID },
    create: { id: PROMOTION_JOB_CATEGORY_ID, campaignId: PROMOTION_JOB_ID, categoryId: CATEGORY_ID }
  });
  await prisma.campaign_Product.upsert({
    where: { campaignId_productId: { campaignId: PROMOTION_JOB_ID, productId: PRODUCT_ID } },
    update: {
      id: PROMOTION_JOB_PRODUCT_ID,
      originalPrice: { amount: 1000, currency: 'TZS' },
      campaignPrice: { amount: 900, currency: 'TZS' },
      appliedAt: new Date()
    },
    create: {
      id: PROMOTION_JOB_PRODUCT_ID,
      campaignId: PROMOTION_JOB_ID,
      productId: PRODUCT_ID,
      originalPrice: { amount: 1000, currency: 'TZS' },
      campaignPrice: { amount: 900, currency: 'TZS' },
      appliedAt: new Date()
    }
  });
  await upsertById(prisma.campaign_Metrics, PROMOTION_JOB_METRICS_ID, {
    campaignId: PROMOTION_JOB_ID,
    views: 25,
    conversions: 2,
    revenue: 1800,
    totalProductsAffected: 1,
    totalRevenueImpact: 250,
    averageDiscountPercent: 10
  });
};

const upsertProductionRecords = async () => {
  await upsertOptionalById(prisma.production_Plan || prisma.productionPlan, PRODUCTION_PLAN_ID, {
    supplierId: OPENAPI_USER_ID,
    name: 'Contract Test Production Plan',
    status: 'SCHEDULED',
    priority: 'MEDIUM',
    startDate: new Date(),
    endDate: futureDate(2),
    targetQuantity: 100,
    actualQuantity: 0,
    version: 1
  });

  await upsertOptionalById(prisma.production_BulkOrderRequest, BULK_ORDER_REQUEST_ID, {
    supplierId: OPENAPI_USER_ID,
    buyerId: CONTRACT_USER_ID,
    title: 'Bulk order for 5,000 woven bags',
    description: 'Buyer is sourcing 5,000 branded woven bags for an April campaign rollout and needs a supplier quote with delivery lead time.',
    productId: PRODUCT_ID,
    quantity: 5000,
    unit: 'bags',
    currency: 'TZS',
    targetUnitPrice: 4200,
    requiredBy: futureDate(21),
    deliveryAddress: 'Mbezi Industrial Area, Dar es Salaam',
    notes: 'Include branding setup cost in the quote notes if applicable.',
    status: 'OPEN',
    metadata: {
      requestedByChannel: 'supplier-portal',
      priority: 'HIGH'
    }
  });

  await upsertOptionalById(prisma.production_CapacitySnapshot, CAPACITY_SNAPSHOT_ID, {
    supplierId: OPENAPI_USER_ID,
    date: normalizeDayUtc(),
    maxCapacity: 10000,
    usedCapacity: 3500,
    reservedCapacity: 1500,
    unit: 'units',
    adjustedBy: OPENAPI_USER_ID,
    reason: 'Initial production planning baseline'
  });

  if (prisma.production_BulkOrderQuote?.upsert) {
    await prisma.production_BulkOrderQuote.deleteMany({
      where: {
        requestId: BULK_ORDER_REQUEST_ID,
        NOT: { id: BULK_ORDER_QUOTE_ID }
      }
    });
  }
};

const upsertCommunityRecords = async () => {
  await prisma.communityUser.upsert({
    where: { id: OPENAPI_USER_ID },
    update: { username: COMMUNITY_USERNAME, displayName: 'Contract Seller', bio: 'Seeded community user for contract tests', location: 'Dar es Salaam', isVerified: true, reputation: 100, status: 'active', lastActiveAt: new Date() },
    create: { id: OPENAPI_USER_ID, username: COMMUNITY_USERNAME, displayName: 'Contract Seller', bio: 'Seeded community user for contract tests', location: 'Dar es Salaam', isVerified: true, reputation: 100, status: 'active', lastActiveAt: new Date() }
  });

  await prisma.community_BusinessProfile.upsert({
    where: { userId: OPENAPI_USER_ID },
    update: {
      id: COMMUNITY_PROFILE_ID,
      businessId: BUSINESS_ID,
      expertiseAreas: [{ area: 'GENERAL', level: 'EXPERT' }],
      industryExperience: ['commerce'],
      certifications: ['Contract Community Expert'],
      contributionScore: 100,
      contributionMetrics: { helpfulAnswers: 5, knowledgeShared: 2, mentorshipHours: 1, articlesPublished: 1, challengesSolved: 1 },
      reputationTier: 'EXPERT',
      businessGoals: [{ description: 'Grow marketplace reach', category: 'growth' }],
      learningObjectives: [{ topic: 'community engagement', priority: 'MEDIUM' }],
      availableForMentorship: true,
      mentorshipCapacity: 3
    },
    create: {
      id: COMMUNITY_PROFILE_ID,
      userId: OPENAPI_USER_ID,
      businessId: BUSINESS_ID,
      expertiseAreas: [{ area: 'GENERAL', level: 'EXPERT' }],
      industryExperience: ['commerce'],
      certifications: ['Contract Community Expert'],
      contributionScore: 100,
      contributionMetrics: { helpfulAnswers: 5, knowledgeShared: 2, mentorshipHours: 1, articlesPublished: 1, challengesSolved: 1 },
      reputationTier: 'EXPERT',
      businessGoals: [{ description: 'Grow marketplace reach', category: 'growth' }],
      learningObjectives: [{ topic: 'community engagement', priority: 'MEDIUM' }],
      availableForMentorship: true,
      mentorshipCapacity: 3
    }
  });

  await prisma.community_BusinessProfile.upsert({
    where: { userId: CONTRACT_USER_ID },
    update: {
      id: COMMUNITY_CONTRACT_PROFILE_ID,
      businessId: BUSINESS_ID,
      expertiseAreas: [{ area: 'GENERAL', level: 'EXPERT' }],
      industryExperience: ['commerce'],
      certifications: ['Contract Community Responder'],
      contributionScore: 650,
      contributionMetrics: { helpfulAnswers: 12, knowledgeShared: 6, mentorshipHours: 4, articlesPublished: 3, challengesSolved: 5 },
      reputationTier: 'EXPERT',
      businessGoals: [{ description: 'Answer community questions', category: 'support' }],
      learningObjectives: [{ topic: 'peer advice', priority: 'LOW' }],
      availableForMentorship: false,
      mentorshipCapacity: 0
    },
    create: {
      id: COMMUNITY_CONTRACT_PROFILE_ID,
      userId: CONTRACT_USER_ID,
      businessId: BUSINESS_ID,
      expertiseAreas: [{ area: 'GENERAL', level: 'EXPERT' }],
      industryExperience: ['commerce'],
      certifications: ['Contract Community Responder'],
      contributionScore: 650,
      contributionMetrics: { helpfulAnswers: 12, knowledgeShared: 6, mentorshipHours: 4, articlesPublished: 3, challengesSolved: 5 },
      reputationTier: 'EXPERT',
      businessGoals: [{ description: 'Answer community questions', category: 'support' }],
      learningObjectives: [{ topic: 'peer advice', priority: 'LOW' }],
      availableForMentorship: false,
      mentorshipCapacity: 0
    }
  });

  if (prisma.community_BusinessChallenge?.deleteMany) {
    await prisma.community_BusinessChallenge.deleteMany({
      where: {
        proposerId: CONTRACT_USER_ID,
        title: CONTRACT_CHALLENGE_TITLE
      }
    });
  }

  if (prisma.community_KnowledgeArticle?.deleteMany) {
    await prisma.community_KnowledgeArticle.deleteMany({
      where: {
        authorId: CONTRACT_USER_ID,
        title: CONTRACT_KNOWLEDGE_ARTICLE_TITLE
      }
    });
  }

  if (prisma.community_ThreadAnswer?.deleteMany) {
    await prisma.community_ThreadAnswer.deleteMany({
      where: {
        threadId: COMMUNITY_THREAD_ID,
        authorId: CONTRACT_USER_ID
      }
    });
  }

  await prisma.post.upsert({
    where: { id: COMMUNITY_POST_ID },
    update: { authorId: OPENAPI_USER_ID, title: 'Contract Test Post', content: 'Seeded community post for contract tests', type: 'text', visibility: 'public', tags: ['contract-test'], status: 'published', publishedAt: new Date() },
    create: { id: COMMUNITY_POST_ID, authorId: OPENAPI_USER_ID, title: 'Contract Test Post', content: 'Seeded community post for contract tests', type: 'text', visibility: 'public', tags: ['contract-test'], status: 'published', publishedAt: new Date() }
  });

  await upsertById(prisma.community_DiscussionThread, COMMUNITY_THREAD_ID, { authorId: OPENAPI_USER_ID, topic: 'Contract Test Discussion', content: 'Seeded discussion thread for contract tests with enough detail to satisfy the minimum content length requirement.', category: 'GENERAL', status: 'OPEN', expertiseLevel: 'BEGINNER', businessContext: { industry: ['commerce'], businessStage: 'growth', tags: ['contract-test'] }, maxResponsesPerUser: 50 });
  await upsertById(prisma.community_ThreadAnswer, COMMUNITY_ANSWER_ID, { threadId: COMMUNITY_THREAD_ID, authorId: OPENAPI_USER_ID, content: 'Seeded answer for contract tests with enough detail to satisfy the minimum answer length requirement.', qualityScore: 80, isAccepted: false });
};

const upsertComplianceRecords = async () => {
  await upsertById(prisma.compliance_KYCRecord, KYC_RECORD_ID, {
    userId: OPENAPI_USER_ID,
    verificationStatus: 'approved',
    submittedAt: new Date(),
    verifiedAt: new Date(),
    verifiedBy: CONTRACT_USER_ID,
    documents: buildSeededKycDocumentPayload(),
    expiryDate: futureDate(365),
    riskLevel: 'low'
  });
};

const upsertAuthArtifacts = async () => {
  await prisma.session.upsert({
    where: { id: AUTH_SESSION_ID },
    update: { userId: OPENAPI_USER_ID, token: AUTH_SESSION_TOKEN, ipAddress: '127.0.0.1', userAgent: 'Schemathesis Contract Test', expiresAt: futureDate(7) },
    create: { id: AUTH_SESSION_ID, userId: OPENAPI_USER_ID, token: AUTH_SESSION_TOKEN, ipAddress: '127.0.0.1', userAgent: 'Schemathesis Contract Test', expiresAt: futureDate(7) }
  });

  await prisma.user_PasswordResetToken.upsert({
    where: { token: PASSWORD_RESET_TOKEN },
    update: { id: PASSWORD_RESET_TOKEN_ID, userId: CONTRACT_USER_ID, expiresAt: futureDate(7), used: false },
    create: { id: PASSWORD_RESET_TOKEN_ID, userId: CONTRACT_USER_ID, token: PASSWORD_RESET_TOKEN, expiresAt: futureDate(7), used: false }
  });

  await prisma.user_EmailVerificationToken.upsert({
    where: { token: EMAIL_VERIFICATION_TOKEN },
    update: { id: EMAIL_VERIFICATION_TOKEN_ID, userId: CONTRACT_USER_ID, expiresAt: futureDate(7), used: false },
    create: { id: EMAIL_VERIFICATION_TOKEN_ID, userId: CONTRACT_USER_ID, token: EMAIL_VERIFICATION_TOKEN, expiresAt: futureDate(7), used: false }
  });

  await prisma.auth_PasswordResetToken.upsert({
    where: { id: AUTH_PASSWORD_RESET_TOKEN_ID },
    update: { userId: CONTRACT_USER_ID, token: PASSWORD_RESET_TOKEN, expiresAt: futureDate(7), used: false },
    create: { id: AUTH_PASSWORD_RESET_TOKEN_ID, userId: CONTRACT_USER_ID, token: PASSWORD_RESET_TOKEN, expiresAt: futureDate(7), used: false }
  });

  await prisma.auth_EmailVerificationToken.upsert({
    where: { id: AUTH_EMAIL_VERIFICATION_TOKEN_ID },
    update: { userId: CONTRACT_USER_ID, token: EMAIL_VERIFICATION_TOKEN, expiresAt: futureDate(7), used: false },
    create: { id: AUTH_EMAIL_VERIFICATION_TOKEN_ID, userId: CONTRACT_USER_ID, token: EMAIL_VERIFICATION_TOKEN, expiresAt: futureDate(7), used: false }
  });
};

const upsertWalletArtifacts = async () => {
  await prisma.wallet_Transaction.upsert({
    where: { id: WALLET_TRANSACTION_ID },
    update: { walletId: OPENAPI_WALLET_ID, userId: OPENAPI_USER_ID, type: 'CREDIT', amount: 1000, currency: 'TZS', balanceBefore: 0, balanceAfter: 1000, frozenAmountBefore: 0, frozenAmountAfter: 0, referenceType: 'contract_test', referenceId: ORDER_ID, description: 'Seeded wallet transaction for contract tests', correlationId: '00000000-0000-4000-8000-000000000001', idempotencyKey: 'contract-wallet-transaction-001', initiatedBy: CONTRACT_USER_ID, initiatedByType: 'system', reason: 'CONTRACT_TEST_SEED' },
    create: { id: WALLET_TRANSACTION_ID, walletId: OPENAPI_WALLET_ID, userId: OPENAPI_USER_ID, type: 'CREDIT', amount: 1000, currency: 'TZS', balanceBefore: 0, balanceAfter: 1000, frozenAmountBefore: 0, frozenAmountAfter: 0, referenceType: 'contract_test', referenceId: ORDER_ID, description: 'Seeded wallet transaction for contract tests', correlationId: '00000000-0000-4000-8000-000000000001', idempotencyKey: 'contract-wallet-transaction-001', initiatedBy: CONTRACT_USER_ID, initiatedByType: 'system', reason: 'CONTRACT_TEST_SEED' }
  });

  await prisma.wallet_Hold.upsert({
    where: { id: WALLET_HOLD_ID },
    update: { walletId: OPENAPI_WALLET_ID, userId: OPENAPI_USER_ID, amount: 250, currency: 'TZS', reason: 'Seeded hold for contract tests', status: 'ACTIVE', expiresAt: futureDate(7) },
    create: { id: WALLET_HOLD_ID, walletId: OPENAPI_WALLET_ID, userId: OPENAPI_USER_ID, amount: 250, currency: 'TZS', reason: 'Seeded hold for contract tests', status: 'ACTIVE', expiresAt: futureDate(7) }
  });
};

const upsertLogisticsRecords = async () => {
  await prisma.logistics_Courier.upsert({
    where: { id: COURIER_ID },
    update: { name: 'Contract Test Courier', phone: '+255700000130', email: 'courier.contract@example.com', status: 'online', vehicleType: 'motorcycle', vehicleLicensePlate: 'T123ABC', vehicleCapacity: 25, vehicleFuelType: 'petrol', currentLatitude: -6.7924, currentLongitude: 39.2083, locationAccuracy: 10, locationTimestamp: new Date(), customerRating: 4.8, onTimeDeliveryRate: 0.96 },
    create: { id: COURIER_ID, name: 'Contract Test Courier', phone: '+255700000130', email: 'courier.contract@example.com', status: 'online', vehicleType: 'motorcycle', vehicleLicensePlate: 'T123ABC', vehicleCapacity: 25, vehicleFuelType: 'petrol', currentLatitude: -6.7924, currentLongitude: 39.2083, locationAccuracy: 10, locationTimestamp: new Date(), customerRating: 4.8, onTimeDeliveryRate: 0.96 }
  });

  await prisma.logistics_Delivery.upsert({
    where: { id: DELIVERY_ID },
    update: { orderId: ORDER_ID, courierId: COURIER_ID, status: 'pending', trackingNumber: TRACKING_NUMBER, pickupStreet: 'Uhuru Street', pickupCity: 'Dar es Salaam', pickupRegion: 'Dar es Salaam', pickupLatitude: -6.7924, pickupLongitude: 39.2083, pickupContactName: 'Pickup Contact', pickupContactPhone: '+255700000140', deliveryStreet: 'Kariakoo', deliveryCity: 'Dar es Salaam', deliveryRegion: 'Dar es Salaam', deliveryLatitude: -6.8001, deliveryLongitude: 39.2833, deliveryContactName: 'Delivery Contact', deliveryContactPhone: '+255700000141', packageWeight: 1, packageValue: 1000, buyerId: CONTRACT_USER_ID, sellerId: OPENAPI_USER_ID, isCOD: true, codAmount: 1000, codCurrency: 'TZS' },
    create: { id: DELIVERY_ID, orderId: ORDER_ID, courierId: COURIER_ID, status: 'pending', trackingNumber: TRACKING_NUMBER, pickupStreet: 'Uhuru Street', pickupCity: 'Dar es Salaam', pickupRegion: 'Dar es Salaam', pickupLatitude: -6.7924, pickupLongitude: 39.2083, pickupContactName: 'Pickup Contact', pickupContactPhone: '+255700000140', deliveryStreet: 'Kariakoo', deliveryCity: 'Dar es Salaam', deliveryRegion: 'Dar es Salaam', deliveryLatitude: -6.8001, deliveryLongitude: 39.2833, deliveryContactName: 'Delivery Contact', deliveryContactPhone: '+255700000141', packageWeight: 1, packageValue: 1000, buyerId: CONTRACT_USER_ID, sellerId: OPENAPI_USER_ID, isCOD: true, codAmount: 1000, codCurrency: 'TZS' }
  });
};

const main = async () => {
  console.log('Preparing Schemathesis contract seed data...');

  await upsertAuthUser(CONTRACT_USER_ID, 'SYSTEM', 'contract.auth@example.com', '+255700000101');
  await upsertAuthUser(OPENAPI_USER_ID, 'SELLER', 'contract.seller@example.com', '+255700000102');
  await upsertUser(CONTRACT_USER_ID, 'SYSTEM', 'contract.auth@example.com', '+255700000101');
  await upsertUser(OPENAPI_USER_ID, 'SELLER', 'contract.seller@example.com', '+255700000102');
  await upsertWallet(CONTRACT_WALLET_ID, CONTRACT_USER_ID, 5000);
  await upsertWallet(OPENAPI_WALLET_ID, OPENAPI_USER_ID, 50000);

  await upsertCategory();
  await upsertProduct();
  await upsertInventoryRecords();
  await upsertBuyBox();
  await upsertAnalyticsSellerRecords();
  await upsertEnablerProfile();
  await upsertBusinessRegistryRecords();
  await upsertOrderRecords();
  await upsertPaymentAndPayoutRecords();
  await upsertCheckoutAndCommissionRecords();
  await upsertCatalogMatchingRecords();
  await upsertNotificationRecords();
  await upsertTrainingRecords();
  await upsertSupportRecords();
  await upsertCampaignRecords();
  await upsertProductionRecords();
  await upsertCommunityRecords();
  await upsertComplianceRecords();
  await upsertAuthArtifacts();
  await upsertWalletArtifacts();
  await upsertLogisticsRecords();

  console.log('Seeded contract data:', {
    contractUserId: CONTRACT_USER_ID,
    openApiUserId: OPENAPI_USER_ID,
    businessId: BUSINESS_ID,
    orderId: ORDER_ID,
    paymentId: PAYMENT_ID,
    payoutId: PAYOUT_ID,
    deliveryId: DELIVERY_ID,
    supportTicketId: SUPPORT_TICKET_ID,
    trainingModuleId: TRAINING_MODULE_ID
  });
};

main()
  .catch((error) => {
    console.error('Failed to seed contract data:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
