const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { createDefaultNormalizationResult, runTransformPipeline } = require('./openapi-transform-pipeline');

const root = path.resolve(__dirname, '..', '..');
const defaultOpenApiPath = path.join(root, 'openapi.yaml');

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];

const PUBLIC_SECURITY = [];
const BEARER_SECURITY = [{ BearerAuth: [] }];
const BEARER_OR_SERVICE_SECURITY = [{ BearerAuth: [] }, { ServiceKey: [] }];
const INTERNAL_CALL_SECURITY = [{ InternalCall: [] }];

const ROOT_PUBLIC_PATHS = new Set(['/debug-sentry', '/health', '/ready']);

const AUTH_PUBLIC_EXACT_PATHS = new Set([
  '/api/auth/blacklist-token',
  '/api/auth/check-blacklist',
  '/api/auth/check-brute-force',
  '/api/auth/device-history/{userId}',
  '/api/auth/device/{deviceId}',
  '/api/auth/extend-session',
  '/api/auth/forgot-password',
  '/api/auth/generate-api-key',
  '/api/auth/invalidate-session',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/metrics',
  '/api/auth/middleware/health',
  '/api/auth/record-failure',
  '/api/auth/refresh',
  '/api/auth/register',
  '/api/auth/report-suspicious',
  '/api/auth/reset-brute-force',
  '/api/auth/reset-password',
  '/api/auth/revoke-api-key',
  '/api/auth/session/{sessionId}',
  '/api/auth/stats',
  '/api/auth/track-device',
  '/api/auth/validate-api-key',
  '/api/auth/validate-token',
]);

const CATALOG_PUBLIC_GET_PATHS = new Set([
  '/api/catalog/products/{productId}/buy-box',
  '/api/catalog/sellers/{sellerId}/storefront',
  '/api/catalog/v1/categories/{categoryId}/attributes',
  '/api/catalog/v1/pricing/rules',
  '/api/catalog/v1/products/search',
  '/api/catalog/v1/products/{id}',
  '/api/catalog/v1/products/{id}/media',
  '/api/catalog/v1/search',
  '/api/catalog/v1/search/analytics',
  '/api/catalog/v1/search/popular',
  '/api/catalog/v1/search/products',
  '/api/catalog/v1/search/suggestions',
  '/api/catalog/v1/sellers/{sellerId}/products',
]);

const CATALOG_PUBLIC_POST_PATHS = new Set([
  '/api/catalog/pricing/calculate',
  '/api/catalog/products/{productId}/buy-box/compute',
  '/api/catalog/v1/pricing/calculate',
  '/api/catalog/v1/pricing/validate-rule',
]);

const COMMUNITY_PUBLIC_GET_PATHS = new Set([
  '/api/community/challenges',
  '/api/community/discussions',
  '/api/community/discussions/{threadId}',
  '/api/community/knowledge/articles',
  '/api/community/knowledge/articles/{articleId}',
  '/api/community/posts/authors/{authorId}',
  '/api/community/posts/published',
  '/api/community/posts/search',
  '/api/community/posts/trending',
  '/api/community/posts/{postId}',
  '/api/community/posts/{postId}/related',
]);

const PAYMENT_PUBLIC_PREFIXES = [
  '/api/payment/payments/webhooks',
  '/api/payment/webhooks',
];

const GENERATED_REQUEST_EXAMPLE_FLAG = 'x-codex-generated-example';
const EXAMPLE_DATE = '2026-03-21';
const EXAMPLE_DATE_TIME = '2026-03-21T09:00:00.000Z';
const DEFAULT_OBJECT_PLACEHOLDER_KEY = 'value';
const CONTRACT_USER_ID = 'usr_test_0001';
const PRIMARY_USER_ID = 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const BUSINESS_ID = 'biz_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const ORDER_ID = 'ord_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const PAYMENT_ID = 'pay_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const PAYOUT_ID = 'pyo_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const DELIVERY_ID = 'obj_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const PRODUCT_ID = 'cat_prd_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const CATEGORY_ID = 'obj_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const MODULE_ID = 'trn_mod_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const TICKET_ID = 'sup_tik_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const ENABLER_LISTING_ID = 'enb_lst_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const WALLET_HOLD_ID = 'wal_hol_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const API_KEY_EXAMPLE = 'sk_test_contract_api_key_1234567890';
const BUSINESS_REGISTRATION_NUMBER = 'TZ-DAR-134695';
const TAX_ID_EXAMPLE = '900134695';
const VALID_E164_PHONE = '+255712345678';
const AFRICAS_TALKING_PHONE = '+255612834684';
const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+KV2QAAAAASUVORK5CYII=';
const CONTRACT_CHALLENGE_TITLE = 'How can we reduce failed doorstep deliveries in dense city zones?';
const CONTRACT_KNOWLEDGE_ARTICLE_TITLE = 'Reducing failed deliveries with earlier buyer confirmation';
const UUID_EXAMPLE = 'e3e70682-c209-4cac-629f-6fbed82c07cd';
const SYSTEM_ID_PATTERN = '^[a-z]{2,6}(?:_[a-z]{2,6})?_[0-9A-HJKMNP-TV-Z]{26}$';
const UUID_PATTERN = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$';
const NON_BLANK_PATTERN = '^(?=.*\\S).+$';
const SAFE_EXAMPLE_EMAIL_PATTERN = '^[A-Za-z][A-Za-z0-9._-]{1,63}@example\\.com$';
const TANZANIA_MOBILE_PATTERN = '^\\+255[67]\\d{8}$';
const AUTH_PHONE_PATTERN = '^\\+?[\\d\\s().-]{7,20}$';
const BUSINESS_REGISTRATION_PATTERN = '^TZ-[A-Z]{2,4}-\\d{4,10}$';
const TAX_ID_PATTERN = '^\\d{9}$';
const SIMPLE_E164_PATTERN = '^\\+?\\d{7,15}$';
const TOPUP_PHONE_PATTERN = '^\\+?[1-9]\\d{1,14}$';
const CREATE_USER_BUSINESS_ID_PATTERN = '^BIZ\\d{6,10}$';

const deepClone = (value) => JSON.parse(JSON.stringify(value));
const deepEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const systemIdSchema = (example) => ({
  type: 'string',
  pattern: SYSTEM_ID_PATTERN,
  ...(example !== undefined ? { example } : {}),
});
const exactSystemIdSchema = (example) => ({
  type: 'string',
  pattern: SYSTEM_ID_PATTERN,
  enum: [example],
  example,
});
const uuidSchema = (example = UUID_EXAMPLE) => ({
  type: 'string',
  format: 'uuid',
  pattern: UUID_PATTERN,
  example,
});
const currencyCodeSchema = (example = 'TZS') => ({
  type: 'string',
  minLength: 3,
  maxLength: 3,
  pattern: '^[A-Z]{3}$',
  example,
});
const exampleDotComEmailSchema = (example = 'contract.user@example.com') => ({
  type: 'string',
  format: 'email',
  minLength: 14,
  maxLength: 76,
  pattern: SAFE_EXAMPLE_EMAIL_PATTERN,
  example,
});
const buildBaseProductCreateSchema = () => ({
  type: 'object',
  additionalProperties: false,
  required: [
    'sellerId',
    'categoryId',
    'brand',
    'productName',
    'minimumOrderQuantity',
    'supplierLocation',
    'structuredAttributes',
    'mediaUrls',
    'price',
  ],
  properties: {
    sellerId: exactSystemIdSchema(PRIMARY_USER_ID),
    categoryId: exactSystemIdSchema(CATEGORY_ID),
    brand: {
      type: 'string',
      minLength: 1,
      maxLength: 120,
      pattern: NON_BLANK_PATTERN,
    },
    productName: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      pattern: NON_BLANK_PATTERN,
    },
    minimumOrderQuantity: {
      type: 'integer',
      minimum: 1,
    },
    supplierLocation: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      pattern: NON_BLANK_PATTERN,
    },
    structuredAttributes: {
      type: 'object',
      minProperties: 1,
      additionalProperties: {
        type: 'string',
        minLength: 1,
        pattern: NON_BLANK_PATTERN,
      },
    },
    mediaUrls: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'string',
        format: 'uri',
      },
    },
    price: {
      type: 'number',
      exclusiveMinimum: true,
      minimum: 0,
    },
    currency: currencyCodeSchema('TZS'),
    seoKeywordsOverride: {
      type: 'array',
      items: {
        type: 'string',
        minLength: 1,
      },
    },
  },
});
const buildWalletPayoutBaseProperties = () => ({
  amount: {
    type: 'number',
    minimum: 10000,
  },
  currency: currencyCodeSchema('TZS'),
  idempotencyKey: {
    type: 'string',
    minLength: 1,
  },
  correlationId: uuidSchema(),
  metadata: {
    type: 'object',
    additionalProperties: true,
  },
});
const buildWalletPayoutBaseRequired = () => ['amount', 'currency', 'method', 'idempotencyKey', 'correlationId'];

const REQUEST_EXAMPLE_OVERRIDES = {
  'POST /api/auth/login': {
    email: 'contract.auth@example.com',
    password: 'StrongPass123!'
  },
  'POST /api/auth/2fa/verify': {
    secret: 'JBSWY3DPEHPK3PXP',
    totpCode: '123456'
  },
  'POST /api/auth/register': {
    email: 'contract.register@example.com',
    phoneNumber: VALID_E164_PHONE,
    firstName: 'Contract',
    lastName: 'Registrar',
    role: 'buyer',
    password: 'StrongPass123!'
  },
  'POST /api/auth/oauth/refresh': {
    refreshToken: 'oauth-refresh-token-example'
  },
  'POST /api/auth/oauth/revoke': {
    token: 'oauth-access-token-example'
  },
  'DELETE /api/auth/admin/sessions/{sessionId}': {
    reason: 'Admin terminated session'
  },
  'DELETE /api/auth/device/{deviceId}': {
    userId: PRIMARY_USER_ID,
    reason: 'logout'
  },
  'POST /api/auth/revoke-api-key': {
    apiKey: API_KEY_EXAMPLE,
    reason: 'rotation'
  },
  'POST /api/auth/validate-api-key': {
    apiKey: API_KEY_EXAMPLE
  },
  'POST /api/business-registry': {
    name: 'Contract Test Business',
    type: 'SOLE_PROPRIETORSHIP',
    ownerId: PRIMARY_USER_ID
  },
  'POST /api/business-registry/businesses': {
    name: 'Contract Test Business',
    businessType: 'SOLE_PROPRIETORSHIP',
    registrationNumber: BUSINESS_REGISTRATION_NUMBER,
    ownerId: PRIMARY_USER_ID,
    taxId: TAX_ID_EXAMPLE,
    description: 'Seeded business for contract tests',
    industry: 'Commerce',
    website: 'https://example.com/contract-business',
    email: 'business.contract@example.com',
    phoneNumber: '+255700000120'
  },
  'POST /api/catalog/v1/products': {
    sellerId: PRIMARY_USER_ID,
    categoryId: CATEGORY_ID,
    brand: 'TechBrand',
    productName: 'Wireless Headphones',
    minimumOrderQuantity: 1,
    supplierLocation: 'Dar es Salaam',
    structuredAttributes: {
      color: 'Black',
      material: 'Steel'
    },
    mediaUrls: ['https://example.com/products/headphones-1.jpg'],
    price: 120000,
    currency: 'TZS'
  },
  'POST /api/catalog/campaigns': {
    name: 'Contract Test Campaign',
    description: 'A discount campaign used to validate pricing and campaign orchestration behavior during contract testing.',
    type: 'DISCOUNT',
    startDate: '2026-03-21T09:00:00.000Z',
    endDate: '2026-03-28T09:00:00.000Z',
    timezone: 'Africa/Dar_es_Salaam',
    pricingRules: [
      {
        type: 'FIXED_DISCOUNT',
        value: 1000,
        priority: 1,
        conditions: []
      }
    ],
    conditions: [
      {
        type: 'MIN_ORDER_VALUE',
        operator: 'GREATER_THAN',
        value: 10000
      }
    ],
    productIds: [PRODUCT_ID],
    categoryIds: [CATEGORY_ID],
    metadata: {
      source: 'contract-test'
    }
  },
  'POST /api/commission/calculate': {
    orderId: ORDER_ID,
    sellerId: PRIMARY_USER_ID,
    orderAmount: 1000,
    recipientType: 'seller',
    commissionType: 'sale'
  },
  'POST /api/community/discussions': {
    topic: 'How can sellers reduce failed deliveries?',
    content: 'I am looking for practical steps that help sellers reduce failed deliveries, improve buyer communication, and keep courier handoffs consistent across busy order periods.',
    category: 'logistics',
    expertiseLevel: 'INTERMEDIATE',
    industry: ['commerce'],
    businessStage: 'growth',
    tags: ['delivery', 'operations'],
    maxResponsesPerUser: 5
  },
  'POST /api/community/challenges': {
    title: CONTRACT_CHALLENGE_TITLE,
    description: 'Our team wants practical ways to reduce failed deliveries in dense city zones where buyers are often away from home and couriers lose time confirming addresses.',
    category: 'logistics',
    industryTags: ['commerce', 'delivery'],
    constraints: ['Keep added courier time under 10 minutes', 'Avoid increasing refund risk'],
    successCriteria: [
      {
        description: 'Reduce failed deliveries by 20% within the next quarter',
        measurable: true,
        targetValue: '20%'
      }
    ],
    deadline: '2026-04-15T09:00:00.000Z'
  },
  'POST /api/community/expertise/validate': {
    expertiseArea: 'GENERAL',
    targetLevel: 'BEGINNER'
  },
  'POST /api/community/knowledge/articles': {
    title: CONTRACT_KNOWLEDGE_ARTICLE_TITLE,
    summary: 'A short playbook for reducing failed deliveries by confirming availability earlier in the order lifecycle.',
    sections: [
      {
        heading: 'Why this matters',
        content: 'Early availability confirmation lowers failed delivery attempts and improves courier scheduling accuracy.',
        order: 1
      },
      {
        heading: 'Recommended workflow',
        content: 'Send a confirmation message before dispatch, verify landmarks, and offer a narrow delivery window buyers can actually meet.',
        order: 2
      }
    ],
    category: 'logistics',
    industryTags: ['commerce', 'delivery'],
    expertiseLevel: 'INTERMEDIATE'
  },
  'POST /api/community/posts': {
    authorId: PRIMARY_USER_ID,
    content: 'Sharing a field note from this week: buyers responded much better when we confirmed delivery windows early and sent a follow-up update before dispatch.',
    type: 'text',
    title: 'Delivery communication tip',
    visibility: 'public',
    metadata: {
      tags: ['delivery', 'operations']
    }
  },
  'POST /api/compliance/aml-record': {
    userId: PRIMARY_USER_ID,
    sanctionsStatus: 'clear',
    pepStatus: false,
    riskScore: 20,
    flags: { source: 'contract-test' }
  },
  'POST /api/compliance/audit-log': {
    userId: PRIMARY_USER_ID,
    action: 'contract_test_action',
    resource: 'order',
    resourceId: ORDER_ID,
    details: { source: 'contract-test' }
  },
  'POST /api/compliance/data-deletion-log': {
    userId: PRIMARY_USER_ID,
    dataType: 'notification',
    recordsDeleted: 1,
    requestedBy: PRIMARY_USER_ID,
    reason: 'User requested deletion'
  },
  'POST /api/compliance/manual-review': {
    userId: PRIMARY_USER_ID,
    decision: 'approved',
    reviewerId: PRIMARY_USER_ID
  },
  'POST /api/compliance/monitor': {
    complianceType: 'kyc',
    entityId: PRIMARY_USER_ID,
    operation: 'status-check'
  },
  'POST /api/compliance/privacy-impact-assessment': {
    projectName: 'Contract Checkout Flow',
    assessor: 'Compliance Officer',
    riskLevel: 'medium',
    findings: { summary: 'Low residual risk' },
    recommendations: { action: 'Monitor periodically' },
    status: 'completed'
  },
  'POST /api/compliance/risk-assessment': {
    userId: PRIMARY_USER_ID,
    assessmentType: 'periodic_review'
  },
  'POST /api/compliance/subject-rights-request': {
    userId: PRIMARY_USER_ID,
    requestType: 'access',
    reason: 'User asked for a copy of data',
    payload: {}
  },
  'POST /api/compliance/tcra-record': {
    userId: PRIMARY_USER_ID,
    licenseNumber: 'TCRA-123456',
    status: 'active'
  },
  'POST /api/compliance/tra-record': {
    userId: PRIMARY_USER_ID,
    tin: TAX_ID_EXAMPLE,
    vrn: '400900134695',
    taxComplianceStatus: 'compliant'
  },
  'POST /api/compliance/verify-document': {
    userId: PRIMARY_USER_ID,
    documentType: 'national_id',
    documentUrl: 'https://example.com/document.pdf'
  },
  'POST /api/enabler/enablers/register': {
    userId: PRIMARY_USER_ID,
    businessName: 'Contract Test Enabler',
    contactEmail: 'enabler.contract@example.com',
    contactPhone: '+255700000111',
    businessDescription: 'Seeded enabler profile for contract tests',
    taxId: TAX_ID_EXAMPLE,
    yearsInBusiness: 3,
    hasBusinessLicense: true,
    salesExperience: 3
  },
  'POST /api/enabler/enablers/{enablerId}/listings': {
    productId: PRODUCT_ID,
    minOrderQuantity: 1,
    visibility: true
  },
  'POST /api/enabler/enablers/{enablerId}/orders': {
    listingId: ENABLER_LISTING_ID,
    buyerId: CONTRACT_USER_ID,
    quantity: 1
  },
  'POST /api/logistics/api/v1/deliveries': {
    orderId: ORDER_ID,
    pickupAddress: {
      street: 'Uhuru Street',
      city: 'Dar es Salaam',
      region: 'Dar es Salaam',
      postalCode: '11101',
      country: 'TZ',
      contactName: 'Contract Seller',
      contactPhone: VALID_E164_PHONE,
      coordinates: {
        lat: -6.7924,
        lng: 39.2083
      }
    },
    deliveryAddress: {
      street: 'Samora Avenue',
      city: 'Dar es Salaam',
      region: 'Dar es Salaam',
      postalCode: '11102',
      country: 'TZ',
      contactName: 'Contract Buyer',
      contactPhone: '+255723456789',
      coordinates: {
        lat: -6.8,
        lng: 39.21
      }
    },
    packageDetails: {
      weight: 2.5,
      dimensions: {
        length: 30,
        width: 20,
        height: 15
      },
      value: 50000,
      fragile: false,
      perishable: false,
      hazardous: false
    },
    priority: 'standard',
    desiredArrivalTime: EXAMPLE_DATE_TIME,
    estimatedArrivalMinutes: 45
  },
  'POST /api/logistics/api/v1/routes/optimize': {
    deliveries: [
      {
        id: DELIVERY_ID,
        address: 'Uhuru Street, Dar es Salaam',
        coordinates: {
          lat: -6.7924,
          lng: 39.2083
        }
      }
    ],
    startLocation: {
      lat: -6.7924,
      lng: 39.2083,
      address: 'Kariakoo, Dar es Salaam'
    },
    endLocation: {
      lat: -6.8049,
      lng: 39.2847,
      address: 'Mikocheni, Dar es Salaam'
    },
    constraints: {
      priority: 'fastest'
    }
  },
  'POST /api/notification/notifications': {
    userId: PRIMARY_USER_ID,
    type: 'email',
    channel: 'email',
    subject: 'Contract test notification',
    content: 'Seeded notification for contract tests',
    priority: 'medium',
    deliveryAddress: 'contract.user@example.com'
  },
  'POST /api/notification/sms/send': {
    phoneNumber: AFRICAS_TALKING_PHONE,
    message: 'Contract test SMS message'
  },
  'POST /api/notification/sms/webhook/africastalking': {
    id: 'msg-123',
    status: 'Success',
    phoneNumber: AFRICAS_TALKING_PHONE
  },
  'POST /api/notification/templates': {
    name: 'contract-template-q69g5fav',
    type: 'email',
    channel: 'email',
    subject: 'Contract test notification',
    bodyTemplate: 'Hello {{name}}',
    variables: ['name']
  },
  'POST /api/order/orders': {
    buyerId: CONTRACT_USER_ID,
    sellerId: PRIMARY_USER_ID,
    currency: 'TZS',
    paymentMethod: 'WALLET',
    items: [
      {
        productId: PRODUCT_ID,
        quantity: 1,
        price: 1000,
        weight: 1
      }
    ],
    deliveryAddress: {
      street: 'Uhuru Street',
      city: 'Dar es Salaam',
      postalCode: '11101',
      country: 'TZ'
    }
  },
  'POST /api/payment/payments': {
    orderId: ORDER_ID,
    userId: PRIMARY_USER_ID,
    amount: 1000,
    currency: 'TZS',
    method: 'MOBILE_MONEY',
    phoneNumber: VALID_E164_PHONE,
    customerEmail: 'contract.user@example.com',
    customerName: 'Contract User',
    callbackUrl: 'https://example.com/payment/callback',
    metadata: {
      contractTest: true
    }
  },
  'POST /api/payment/payments/webhooks/pesapal': {
    OrderTrackingId: PAYMENT_ID,
    OrderMerchantReference: PAYMENT_ID,
    OrderNotificationType: 'CHANGE',
    status: 'COMPLETED'
  },
  'POST /api/payout/payouts': {
    userId: PRIMARY_USER_ID,
    userRole: 'seller',
    amount: 15000,
    currency: 'TZS',
    method: 'MOBILE_MONEY',
    mobileMoneyDetails: {
      provider: 'MPESA',
      phoneNumber: VALID_E164_PHONE,
      accountName: 'Contract Seller'
    },
    availableBalance: 50000,
    userStatus: 'ACTIVE',
    lastPayoutDate: '2026-03-01T09:00:00.000Z'
  },
  'POST /api/payment/webhooks/pesapal': {
    OrderTrackingId: PAYMENT_ID,
    OrderMerchantReference: PAYMENT_ID,
    OrderNotificationType: 'CHANGE',
    status: 'COMPLETED'
  },
  'POST /api/production/plans': {
    supplierId: PRIMARY_USER_ID,
    name: 'Contract Test Production Plan',
    targetQuantity: 10,
    startDate: EXAMPLE_DATE_TIME,
    endDate: '2026-03-22T09:00:00.000Z',
    priority: 'MEDIUM',
    maxCapacity: 20,
    usedCapacity: 0,
    reservedCapacity: 0,
    capacityUnit: 'units'
  },
  'POST /api/production/quality/checkpoints': {
    orderId: ORDER_ID,
    passed: true,
    defectCount: 0,
    notes: 'Contract quality checkpoint',
    images: ['https://example.com/inspection.png']
  },
  'POST /api/support/agents': {
    userId: PRIMARY_USER_ID,
    specializations: ['GENERAL', 'ORDERS'],
    maxConcurrentTickets: 5
  },
  'POST /api/support/tickets': {
    subject: 'Contract support ticket',
    description: 'Need help validating the contract-test support flow.',
    category: 'GENERAL',
    priority: 'MEDIUM'
  },
  'POST /api/user': {
    email: 'contract.created.user@example.com',
    phoneNumber: VALID_E164_PHONE,
    firstName: 'Contract',
    lastName: 'Created',
    role: 'buyer',
    preferredLanguage: 'en',
    preferredCurrency: 'TZS'
  },
  'PUT /api/user/profile': {
    firstName: 'Contract',
    language: 'en',
    timezone: 'Africa/Dar_es_Salaam',
    notificationsEnabled: true
  },
  'PUT /api/user/{id}': {
    firstName: 'Contract',
    language: 'en',
    timezone: 'Africa/Dar_es_Salaam',
    notificationsEnabled: true
  },
  'POST /api/user/verify-email/{token}': {
    userId: PRIMARY_USER_ID
  },
  'POST /api/user/reset-password/{token}': {
    userId: PRIMARY_USER_ID,
    token: 'token-example',
    newPassword: 'NewPass123!'
  },
  'POST /api/user/{id}/password': {
    currentPassword: 'OldPass123!',
    newPassword: 'NewPass123!'
  },
  'POST /api/user/{id}/suspend': {
    reason: 'Repeated policy violations',
    duration: 7
  },
  'POST /api/user/{id}/role': {
    newRole: 'seller'
  },
  'POST /api/user/{id}/phone/verify': {
    phoneNumber: VALID_E164_PHONE,
    otp: '123456',
    verificationMethod: 'otp'
  },
  'POST /api/user/{id}/2fa/setup': {
    method: 'totp',
    deviceId: 'device-contract-001'
  },
  'POST /api/user/security/breaches/report': {
    userId: PRIMARY_USER_ID,
    breachType: 'suspicious_login',
    severity: 'high',
    details: {
      location: 'Dar es Salaam'
    }
  },
  'PUT /api/catalog/v1/products/{id}/category': {
    categoryId: CATEGORY_ID
  },
  'POST /api/business-registry/businesses/{id}/verify': {
    verifiedBy: PRIMARY_USER_ID,
    documentTypes: ['TAX_CERTIFICATE']
  },
  'POST /api/business-registry/businesses/{id}/suspend': {
    suspendedBy: PRIMARY_USER_ID,
    reason: 'Contract example'
  },
  'PUT /api/notification/templates/{id}': {
    bodyTemplate: 'Hello {{name}}',
    variables: ['name']
  },
  'POST /api/wallet/wallets/{userId}/hold/{holdId}/capture': {
    amount: 100,
    reason: 'Capture reserved funds',
    idempotencyKey: 'wallet-hold-capture-001',
    correlationId: UUID_EXAMPLE
  },
  'POST /api/wallet/wallets/{userId}/hold/{holdId}/release': {
    reason: 'Release unused reserved funds',
    idempotencyKey: 'wallet-hold-release-001',
    correlationId: UUID_EXAMPLE
  },
  'POST /api/wallet/wallets/{userId}/topup': {
    amount: 5000,
    currency: 'TZS',
    method: 'MPESA',
    customerEmail: 'contract.user@example.com',
    customerName: 'Contract User',
    phoneNumber: VALID_E164_PHONE,
    callbackUrl: 'https://example.com/wallet/topup/callback',
    correlationId: UUID_EXAMPLE,
    metadata: {
      source: 'contract-test'
    }
  },
  'POST /api/wallet/wallets/{userId}/payout': {
    amount: 10000,
    currency: 'TZS',
    method: 'MOBILE_MONEY',
    mobileMoneyDetails: {
      provider: 'MPESA',
      phoneNumber: VALID_E164_PHONE,
      accountName: 'Contract User'
    },
    idempotencyKey: 'wallet-payout-001',
    correlationId: UUID_EXAMPLE,
    metadata: {
      source: 'contract-test'
    }
  }
};

const REQUEST_SCHEMA_OVERRIDES = {
  'POST /api/auth/register': {
    type: 'object',
    additionalProperties: false,
    required: ['email', 'phoneNumber', 'firstName', 'lastName', 'password'],
    properties: {
      email: exampleDotComEmailSchema('contract.register@example.com'),
      phoneNumber: {
        type: 'string',
        pattern: TANZANIA_MOBILE_PATTERN,
      },
      firstName: {
        type: 'string',
        minLength: 2,
        maxLength: 100,
        pattern: NON_BLANK_PATTERN,
      },
      lastName: {
        type: 'string',
        minLength: 2,
        maxLength: 100,
        pattern: NON_BLANK_PATTERN,
      },
      role: {
        type: 'string',
        enum: ['buyer', 'seller', 'courier', 'supplier', 'enabler', 'system', 'admin', 'user'],
      },
      phone: {
        type: 'string',
        pattern: TANZANIA_MOBILE_PATTERN,
      },
      password: {
        type: 'string',
        minLength: 8,
      },
      profile: {
        type: 'object',
        additionalProperties: true,
      },
    },
  },
  'POST /api/auth/oauth/refresh': {
    type: 'object',
    additionalProperties: false,
    required: ['refreshToken'],
    properties: {
      refreshToken: {
        type: 'string',
        minLength: 1,
        pattern: '^[!-~]+$',
      },
    },
  },
  'POST /api/auth/oauth/revoke': {
    type: 'object',
    additionalProperties: false,
    required: ['token'],
    properties: {
      token: {
        type: 'string',
        minLength: 1,
        pattern: NON_BLANK_PATTERN,
      },
    },
  },
  'DELETE /api/auth/admin/sessions/{sessionId}': {
    type: 'object',
    additionalProperties: false,
    properties: {
      reason: {
        type: 'string',
        minLength: 1,
        pattern: NON_BLANK_PATTERN,
      },
    },
  },
  'DELETE /api/auth/device/{deviceId}': {
    type: 'object',
    additionalProperties: false,
    required: ['userId'],
    properties: {
      userId: exactSystemIdSchema(PRIMARY_USER_ID),
      reason: {
        type: 'string',
        minLength: 1,
        pattern: NON_BLANK_PATTERN,
      },
    },
  },
  'POST /api/business-registry/businesses': {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'businessType', 'registrationNumber', 'ownerId'],
    properties: {
      name: {
        type: 'string',
        minLength: 2,
        maxLength: 200,
        pattern: NON_BLANK_PATTERN,
      },
      businessType: {
        type: 'string',
        enum: ['SOLE_PROPRIETORSHIP', 'PARTNERSHIP', 'LIMITED_LIABILITY', 'CORPORATION'],
      },
      registrationNumber: {
        type: 'string',
        pattern: BUSINESS_REGISTRATION_PATTERN,
      },
      ownerId: exactSystemIdSchema(PRIMARY_USER_ID),
      taxId: {
        type: 'string',
        pattern: TAX_ID_PATTERN,
      },
      description: {
        type: 'string',
        maxLength: 1000,
      },
      industry: {
        type: 'string',
        maxLength: 100,
        pattern: NON_BLANK_PATTERN,
      },
      website: {
        type: 'string',
        format: 'uri',
      },
      email: {
        type: 'string',
        format: 'email',
      },
      phoneNumber: {
        type: 'string',
        maxLength: 20,
        pattern: TANZANIA_MOBILE_PATTERN,
      },
      addresses: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'street', 'city', 'region'],
          properties: {
            type: {
              type: 'string',
              enum: ['MAIN', 'BRANCH', 'WAREHOUSE', 'OTHER'],
            },
            street: {
              type: 'string',
              minLength: 1,
              pattern: NON_BLANK_PATTERN,
            },
            city: {
              type: 'string',
              minLength: 1,
              pattern: NON_BLANK_PATTERN,
            },
            region: {
              type: 'string',
              minLength: 1,
              pattern: NON_BLANK_PATTERN,
            },
            postalCode: {
              type: 'string',
            },
            country: {
              type: 'string',
              default: 'Tanzania',
            },
            isPrimary: {
              type: 'boolean',
            },
          },
        },
      },
    },
  },
  'POST /api/catalog/campaigns': {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'type', 'startDate', 'endDate', 'pricingRules'],
    properties: {
      name: {
        type: 'string',
        minLength: 3,
        maxLength: 255,
      },
      description: {
        type: 'string',
        maxLength: 1000,
      },
      type: {
        type: 'string',
        enum: ['DISCOUNT', 'PROMOTION', 'CLEARANCE', 'SEASONAL'],
      },
      startDate: {
        type: 'string',
        format: 'date-time',
      },
      endDate: {
        type: 'string',
        format: 'date-time',
      },
      timezone: {
        type: 'string',
        minLength: 1,
      },
      pricingRules: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'value'],
          properties: {
            type: {
              type: 'string',
              enum: ['FIXED_DISCOUNT', 'PERCENTAGE_DISCOUNT', 'FIXED_PRICE', 'BUY_GET'],
            },
            value: {
              type: 'number',
              exclusiveMinimum: true,
              minimum: 0,
            },
            priority: {
              type: 'integer',
              minimum: 0,
            },
            conditions: {
              type: 'array',
              items: {},
            },
          },
        },
      },
      conditions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'operator', 'value'],
          properties: {
            type: {
              type: 'string',
              enum: ['MIN_ORDER_VALUE', 'MAX_USES_PER_CUSTOMER', 'CUSTOMER_SEGMENT', 'GEOGRAPHIC_REGION'],
            },
            operator: {
              type: 'string',
              enum: ['EQUALS', 'GREATER_THAN', 'LESS_THAN', 'IN', 'CONTAINS'],
            },
            value: {
              anyOf: [
                { type: 'string' },
                { type: 'number' },
                { type: 'boolean' },
                {
                  type: 'object',
                  additionalProperties: true,
                },
                {
                  type: 'array',
                  items: {},
                },
              ],
            },
          },
        },
      },
      productIds: {
        type: 'array',
        items: systemIdSchema(PRODUCT_ID),
      },
      categoryIds: {
        type: 'array',
        items: systemIdSchema(CATEGORY_ID),
      },
      metadata: {
        type: 'object',
        additionalProperties: true,
      },
    },
  },
  'POST /api/catalog/v1/products': {
    oneOf: [
      buildBaseProductCreateSchema(),
      (() => {
        const schema = buildBaseProductCreateSchema();
        schema.required = [...schema.required, 'enablerEnabled', 'enablerCommissionRate'];
        schema.properties.enablerEnabled = { type: 'boolean', const: true };
        schema.properties.enablerCommissionRate = {
          type: 'number',
          exclusiveMinimum: true,
          minimum: 0,
          maximum: 1,
        };
        return schema;
      })(),
    ],
  },
  'POST /api/community/discussions': {
    type: 'object',
    additionalProperties: false,
    required: ['topic', 'content', 'category', 'expertiseLevel', 'industry', 'tags'],
    properties: {
      topic: {
        type: 'string',
        minLength: 10,
        maxLength: 200,
        pattern: NON_BLANK_PATTERN,
      },
      content: {
        type: 'string',
        minLength: 50,
        maxLength: 2000,
        pattern: NON_BLANK_PATTERN,
      },
      category: {
        type: 'string',
        minLength: 1,
        pattern: NON_BLANK_PATTERN,
      },
      expertiseLevel: {
        type: 'string',
        enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'],
      },
      industry: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'string',
          minLength: 1,
          pattern: NON_BLANK_PATTERN,
        },
      },
      businessStage: {
        type: 'string',
        minLength: 1,
        pattern: NON_BLANK_PATTERN,
      },
      tags: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'string',
          minLength: 1,
          pattern: NON_BLANK_PATTERN,
        },
      },
      maxResponsesPerUser: {
        type: 'integer',
        minimum: 1,
        maximum: 10,
      },
    },
  },
  'POST /api/enabler/enablers/register': {
    type: 'object',
    additionalProperties: false,
    required: ['userId', 'businessName', 'contactEmail', 'hasBusinessLicense', 'salesExperience'],
    properties: {
      userId: exactSystemIdSchema(PRIMARY_USER_ID),
      businessName: {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        pattern: NON_BLANK_PATTERN,
      },
      contactEmail: exampleDotComEmailSchema('enabler.contract@example.com'),
      contactPhone: {
        type: 'string',
        maxLength: 20,
        pattern: TANZANIA_MOBILE_PATTERN,
      },
      businessDescription: {
        type: 'string',
        maxLength: 1000,
        pattern: NON_BLANK_PATTERN,
      },
      taxId: {
        type: 'string',
        pattern: TAX_ID_PATTERN,
      },
      yearsInBusiness: {
        type: 'number',
        minimum: 0,
      },
      hasBusinessLicense: {
        type: 'boolean',
        const: true,
      },
      salesExperience: {
        type: 'number',
        minimum: 0.5,
      },
    },
  },
  'POST /api/enabler/enablers/{enablerId}/listings': {
    type: 'object',
    additionalProperties: false,
    required: ['productId'],
    properties: {
      productId: exactSystemIdSchema(PRODUCT_ID),
      customPrice: {
        type: 'number',
        exclusiveMinimum: true,
        minimum: 0,
      },
      priceMarkup: {
        type: 'number',
        minimum: 0,
        maximum: 0.5,
      },
      minOrderQuantity: {
        type: 'integer',
        minimum: 1,
      },
      deliveryTimeframe: {
        type: 'string',
        minLength: 1,
        pattern: NON_BLANK_PATTERN,
      },
      returnPolicy: {
        type: 'string',
        minLength: 1,
        pattern: NON_BLANK_PATTERN,
      },
      warrantyPeriod: {
        type: 'integer',
        minimum: 0,
      },
      visibility: {
        type: 'boolean',
      },
    },
  },
  'POST /api/enabler/enablers/{enablerId}/orders': {
    type: 'object',
    additionalProperties: false,
    required: ['listingId', 'buyerId', 'quantity'],
    properties: {
      listingId: exactSystemIdSchema(ENABLER_LISTING_ID),
      buyerId: exactSystemIdSchema(CONTRACT_USER_ID),
      quantity: {
        type: 'integer',
        minimum: 1,
      },
      shippingAddressId: {
        type: 'string',
        minLength: 1,
      },
      billingAddressId: {
        type: 'string',
        minLength: 1,
      },
    },
  },
  'POST /api/support/agents': {
    type: 'object',
    additionalProperties: false,
    required: ['userId'],
    properties: {
      userId: exactSystemIdSchema(PRIMARY_USER_ID),
      specializations: {
        type: 'array',
        items: {
          type: 'string',
          minLength: 1,
          pattern: NON_BLANK_PATTERN,
        },
      },
      maxConcurrentTickets: {
        type: 'integer',
        minimum: 1,
        maximum: 50,
      },
    },
  },
  'POST /api/user': {
    type: 'object',
    additionalProperties: false,
    required: ['email', 'phoneNumber', 'firstName', 'lastName', 'role'],
    properties: {
      email: exampleDotComEmailSchema('contract.created.user@example.com'),
      phoneNumber: {
        type: 'string',
        pattern: TANZANIA_MOBILE_PATTERN,
      },
      firstName: {
        type: 'string',
        minLength: 2,
        maxLength: 100,
        pattern: NON_BLANK_PATTERN,
      },
      lastName: {
        type: 'string',
        minLength: 2,
        maxLength: 100,
        pattern: NON_BLANK_PATTERN,
      },
      dateOfBirth: {
        type: 'string',
        format: 'date-time',
      },
      role: {
        type: 'string',
        enum: ['buyer', 'seller', 'supplier', 'courier', 'enabler', 'system'],
      },
      preferredLanguage: {
        type: 'string',
        minLength: 2,
        pattern: NON_BLANK_PATTERN,
      },
      preferredCurrency: {
        type: 'string',
        minLength: 3,
        pattern: '^[A-Z]{3}$',
      },
      businessId: {
        type: 'string',
        pattern: CREATE_USER_BUSINESS_ID_PATTERN,
      },
      addresses: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'isPrimary', 'street', 'city', 'postalCode', 'country'],
          properties: {
            type: {
              type: 'string',
              enum: ['billing', 'shipping', 'business', 'home'],
            },
            isPrimary: {
              type: 'boolean',
            },
            street: {
              type: 'string',
              minLength: 1,
              pattern: NON_BLANK_PATTERN,
            },
            city: {
              type: 'string',
              minLength: 1,
              pattern: NON_BLANK_PATTERN,
            },
            state: {
              type: 'string',
            },
            postalCode: {
              type: 'string',
              minLength: 1,
              pattern: NON_BLANK_PATTERN,
            },
            country: {
              type: 'string',
              minLength: 1,
              pattern: NON_BLANK_PATTERN,
            },
            coordinates: {
              type: 'object',
              additionalProperties: false,
              required: ['latitude', 'longitude'],
              properties: {
                latitude: {
                  type: 'number',
                  minimum: -90,
                  maximum: 90,
                },
                longitude: {
                  type: 'number',
                  minimum: -180,
                  maximum: 180,
                },
              },
            },
          },
        },
      },
    },
  },
  'POST /api/wallet/wallets/{userId}/hold/{holdId}/capture': {
    type: 'object',
    additionalProperties: false,
    required: ['idempotencyKey', 'correlationId'],
    properties: {
      amount: {
        type: 'number',
        exclusiveMinimum: true,
        minimum: 0,
      },
      reason: {
        type: 'string',
        minLength: 1,
      },
      idempotencyKey: {
        type: 'string',
        minLength: 1,
      },
      correlationId: uuidSchema(),
    },
  },
  'POST /api/wallet/wallets/{userId}/hold/{holdId}/release': {
    type: 'object',
    additionalProperties: false,
    required: ['idempotencyKey', 'correlationId'],
    properties: {
      reason: {
        type: 'string',
        minLength: 1,
      },
      idempotencyKey: {
        type: 'string',
        minLength: 1,
      },
      correlationId: uuidSchema(),
    },
  },
  'POST /api/wallet/wallets/{userId}/topup': {
    oneOf: [
      {
        type: 'object',
        additionalProperties: false,
        required: ['amount', 'currency', 'method', 'phoneNumber', 'correlationId'],
        properties: {
          amount: {
            type: 'number',
            minimum: 500,
          },
          currency: currencyCodeSchema('TZS'),
          method: {
            type: 'string',
            enum: ['MOBILE_MONEY', 'MPESA', 'AIRTEL_MONEY', 'TIGO_PESA', 'HALOPESA'],
          },
          customerEmail: exampleDotComEmailSchema(),
          customerName: {
            type: 'string',
            minLength: 1,
            pattern: NON_BLANK_PATTERN,
          },
          phoneNumber: {
            type: 'string',
            pattern: TANZANIA_MOBILE_PATTERN,
          },
          callbackUrl: {
            type: 'string',
            format: 'uri',
          },
          correlationId: uuidSchema(),
          metadata: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
      {
        type: 'object',
        additionalProperties: false,
        required: ['amount', 'currency', 'method', 'correlationId'],
        properties: {
          amount: {
            type: 'number',
            minimum: 100,
          },
          currency: currencyCodeSchema('TZS'),
          method: {
            type: 'string',
            const: 'WALLET',
          },
          customerEmail: exampleDotComEmailSchema(),
          customerName: {
            type: 'string',
            minLength: 1,
            pattern: NON_BLANK_PATTERN,
          },
          callbackUrl: {
            type: 'string',
            format: 'uri',
          },
          correlationId: uuidSchema(),
          metadata: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
      {
        type: 'object',
        additionalProperties: false,
        required: ['amount', 'currency', 'method', 'correlationId'],
        properties: {
          amount: {
            type: 'number',
            minimum: 1000,
          },
          currency: currencyCodeSchema('TZS'),
          method: {
            type: 'string',
            enum: ['CARD', 'BANK_TRANSFER'],
          },
          customerEmail: exampleDotComEmailSchema(),
          customerName: {
            type: 'string',
            minLength: 1,
            pattern: NON_BLANK_PATTERN,
          },
          callbackUrl: {
            type: 'string',
            format: 'uri',
          },
          correlationId: uuidSchema(),
          metadata: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
    ],
  },
  'POST /api/wallet/wallets/{userId}/payout': {
    oneOf: [
      {
        type: 'object',
        additionalProperties: false,
        required: [...buildWalletPayoutBaseRequired(), 'mobileMoneyDetails'],
        properties: {
          ...buildWalletPayoutBaseProperties(),
          method: {
            type: 'string',
            const: 'MOBILE_MONEY',
          },
          mobileMoneyDetails: {
            type: 'object',
            additionalProperties: false,
            required: ['provider', 'phoneNumber', 'accountName'],
            properties: {
              provider: {
                type: 'string',
                minLength: 1,
              },
              phoneNumber: {
                type: 'string',
                pattern: TOPUP_PHONE_PATTERN,
              },
              accountName: {
                type: 'string',
                minLength: 1,
              },
            },
          },
        },
      },
      {
        type: 'object',
        additionalProperties: false,
        required: [...buildWalletPayoutBaseRequired(), 'bankDetails'],
        properties: {
          ...buildWalletPayoutBaseProperties(),
          method: {
            type: 'string',
            const: 'BANK_TRANSFER',
          },
          bankDetails: {
            type: 'object',
            additionalProperties: false,
            required: ['bankName', 'bankCode', 'accountNumber', 'accountName'],
            properties: {
              bankName: {
                type: 'string',
                minLength: 1,
              },
              bankCode: {
                type: 'string',
                minLength: 1,
              },
              accountNumber: {
                type: 'string',
                minLength: 1,
              },
              accountName: {
                type: 'string',
                minLength: 1,
              },
              branchCode: {
                type: 'string',
                minLength: 1,
              },
            },
          },
        },
      },
      {
        type: 'object',
        additionalProperties: false,
        required: buildWalletPayoutBaseRequired(),
        properties: {
          ...buildWalletPayoutBaseProperties(),
          method: {
            type: 'string',
            const: 'WALLET',
          },
        },
      },
    ],
  },
  'POST /api/community/challenges': {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'description', 'category', 'industryTags', 'successCriteria'],
    properties: {
      title: {
        type: 'string',
        minLength: 10,
        maxLength: 200,
      },
      description: {
        type: 'string',
        minLength: 100,
        maxLength: 2000,
      },
      category: {
        type: 'string',
      },
      industryTags: {
        type: 'array',
        minItems: 1,
        items: { type: 'string' },
      },
      constraints: {
        type: 'array',
        items: { type: 'string' },
      },
      successCriteria: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['description', 'measurable'],
          properties: {
            description: { type: 'string' },
            measurable: { type: 'boolean' },
            targetValue: { type: 'string' },
          },
        },
      },
      deadline: {
        type: 'string',
        format: 'date-time',
      },
    },
  },
  'POST /api/community/expertise/validate': {
    type: 'object',
    additionalProperties: false,
    required: ['expertiseArea', 'targetLevel'],
    properties: {
      expertiseArea: {
        type: 'string',
      },
      targetLevel: {
        type: 'string',
        enum: ['BEGINNER', 'INTERMEDIATE', 'EXPERT', 'MENTOR'],
      },
    },
  },
  'POST /api/community/knowledge/articles': {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'summary', 'sections', 'category', 'industryTags', 'expertiseLevel'],
    properties: {
      title: {
        type: 'string',
        minLength: 1,
        maxLength: 200,
      },
      summary: {
        type: 'string',
        minLength: 50,
        maxLength: 500,
      },
      sections: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['heading', 'content', 'order'],
          properties: {
            heading: { type: 'string' },
            content: { type: 'string' },
            order: { type: 'integer', minimum: 1 },
          },
        },
      },
      category: {
        type: 'string',
      },
      industryTags: {
        type: 'array',
        minItems: 1,
        items: { type: 'string' },
      },
      expertiseLevel: {
        type: 'string',
        enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'],
      },
    },
  },
  'POST /api/auth/2fa/verify': {
    type: 'object',
    additionalProperties: false,
    required: ['secret', 'totpCode'],
    properties: {
      secret: {
        type: 'string',
        minLength: 16,
        maxLength: 64,
        pattern: '^[A-Z2-7]+=*$',
        example: 'JBSWY3DPEHPK3PXP',
      },
      totpCode: {
        type: 'string',
        minLength: 6,
        maxLength: 6,
        pattern: '^\\d{6}$',
        example: '123456',
      },
    },
  },
  'POST /api/payment/payments': {
    oneOf: [
      {
        type: 'object',
        additionalProperties: false,
        required: ['orderId', 'amount', 'currency', 'method'],
        properties: {
          orderId: exactSystemIdSchema(ORDER_ID),
          userId: exactSystemIdSchema(PRIMARY_USER_ID),
          amount: {
            type: 'number',
            exclusiveMinimum: true,
            minimum: 500,
          },
          currency: currencyCodeSchema('TZS'),
          method: {
            type: 'string',
            enum: ['MOBILE_MONEY', 'MPESA', 'AIRTEL_MONEY', 'TIGO_PESA', 'HALOPESA'],
          },
          phoneNumber: {
            type: 'string',
            pattern: TOPUP_PHONE_PATTERN,
            example: VALID_E164_PHONE,
          },
          customerName: {
            type: 'string',
            minLength: 1,
            pattern: NON_BLANK_PATTERN,
          },
          customerEmail: exampleDotComEmailSchema('contract.user@example.com'),
          metadata: {
            type: 'object',
            additionalProperties: true,
          },
          callbackUrl: {
            type: 'string',
            format: 'uri',
            example: 'https://example.com/payment/callback',
          },
        },
      },
      {
        type: 'object',
        additionalProperties: false,
        required: ['orderId', 'amount', 'currency', 'method'],
        properties: {
          orderId: exactSystemIdSchema(ORDER_ID),
          userId: exactSystemIdSchema(PRIMARY_USER_ID),
          amount: {
            type: 'number',
            exclusiveMinimum: true,
            minimum: 100,
          },
          currency: currencyCodeSchema('TZS'),
          method: {
            type: 'string',
            enum: ['WALLET'],
          },
          phoneNumber: {
            type: 'string',
            pattern: TOPUP_PHONE_PATTERN,
            example: VALID_E164_PHONE,
          },
          customerName: {
            type: 'string',
            minLength: 1,
            pattern: NON_BLANK_PATTERN,
          },
          customerEmail: exampleDotComEmailSchema('contract.user@example.com'),
          metadata: {
            type: 'object',
            additionalProperties: true,
          },
          callbackUrl: {
            type: 'string',
            format: 'uri',
            example: 'https://example.com/payment/callback',
          },
        },
      },
      {
        type: 'object',
        additionalProperties: false,
        required: ['orderId', 'amount', 'currency', 'method'],
        properties: {
          orderId: exactSystemIdSchema(ORDER_ID),
          userId: exactSystemIdSchema(PRIMARY_USER_ID),
          amount: {
            type: 'number',
            exclusiveMinimum: true,
            minimum: 1000,
          },
          currency: currencyCodeSchema('TZS'),
          method: {
            type: 'string',
            enum: ['CARD', 'BANK_TRANSFER'],
          },
          phoneNumber: {
            type: 'string',
            pattern: TOPUP_PHONE_PATTERN,
            example: VALID_E164_PHONE,
          },
          customerName: {
            type: 'string',
            minLength: 1,
            pattern: NON_BLANK_PATTERN,
          },
          customerEmail: exampleDotComEmailSchema('contract.user@example.com'),
          metadata: {
            type: 'object',
            additionalProperties: true,
          },
          callbackUrl: {
            type: 'string',
            format: 'uri',
            example: 'https://example.com/payment/callback',
          },
        },
      },
    ],
  },
  'POST /api/notification/sms/webhook/africastalking': {
    type: 'object',
    additionalProperties: false,
    required: ['id', 'status', 'phoneNumber'],
    properties: {
      id: {
        type: 'string',
        minLength: 1,
        pattern: NON_BLANK_PATTERN,
      },
      status: {
        type: 'string',
        minLength: 1,
        pattern: NON_BLANK_PATTERN,
      },
      phoneNumber: {
        type: 'string',
        pattern: TANZANIA_MOBILE_PATTERN,
        example: AFRICAS_TALKING_PHONE,
      },
      failureReason: {
        type: 'string',
        minLength: 1,
        pattern: NON_BLANK_PATTERN,
      },
    },
  },
  'POST /api/user/request-password-reset': {
    type: 'object',
    additionalProperties: false,
    required: ['email'],
    properties: {
      email: exampleDotComEmailSchema('contract.user@example.com'),
    },
  },
  'PUT /api/user/profile': {
    type: 'object',
    additionalProperties: false,
    properties: {
      firstName: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        pattern: NON_BLANK_PATTERN,
      },
      lastName: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        pattern: NON_BLANK_PATTERN,
      },
      phoneNumber: {
        type: 'string',
        pattern: '^\\+?\\d{7,15}$',
        example: VALID_E164_PHONE,
      },
      dateOfBirth: {
        type: 'string',
        format: 'date-time',
      },
      avatar: {
        type: 'string',
        minLength: 1,
        pattern: NON_BLANK_PATTERN,
      },
      language: {
        type: 'string',
        minLength: 2,
        maxLength: 10,
        pattern: NON_BLANK_PATTERN,
        example: 'en',
      },
      timezone: {
        type: 'string',
        minLength: 1,
        pattern: NON_BLANK_PATTERN,
        example: 'Africa/Dar_es_Salaam',
      },
      notificationsEnabled: {
        type: 'boolean',
      },
    },
  },
  'PUT /api/user/{id}': {
    type: 'object',
    additionalProperties: false,
    properties: {
      firstName: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        pattern: NON_BLANK_PATTERN,
      },
      lastName: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        pattern: NON_BLANK_PATTERN,
      },
      phoneNumber: {
        type: 'string',
        pattern: '^\\+?\\d{7,15}$',
        example: VALID_E164_PHONE,
      },
      dateOfBirth: {
        type: 'string',
        format: 'date-time',
      },
      avatar: {
        type: 'string',
        minLength: 1,
        pattern: NON_BLANK_PATTERN,
      },
      language: {
        type: 'string',
        minLength: 2,
        maxLength: 10,
        pattern: NON_BLANK_PATTERN,
        example: 'en',
      },
      timezone: {
        type: 'string',
        minLength: 1,
        pattern: NON_BLANK_PATTERN,
        example: 'Africa/Dar_es_Salaam',
      },
      notificationsEnabled: {
        type: 'boolean',
      },
    },
  },
  'POST /api/user/verify-email/{token}': {
    type: 'object',
    additionalProperties: false,
    required: ['userId'],
    properties: {
      userId: exactSystemIdSchema(PRIMARY_USER_ID),
    },
  },
  'POST /api/user/reset-password/{token}': {
    type: 'object',
    additionalProperties: false,
    required: ['userId', 'token', 'newPassword'],
    properties: {
      userId: exactSystemIdSchema(PRIMARY_USER_ID),
      token: {
        type: 'string',
        minLength: 1,
        pattern: NON_BLANK_PATTERN,
        example: 'token-example',
      },
      newPassword: {
        type: 'string',
        minLength: 8,
        example: 'NewPass123!',
      },
    },
  },
  'POST /api/user/{id}/password': {
    type: 'object',
    additionalProperties: false,
    required: ['currentPassword', 'newPassword'],
    properties: {
      currentPassword: {
        type: 'string',
        minLength: 8,
        example: 'OldPass123!',
      },
      newPassword: {
        type: 'string',
        minLength: 8,
        example: 'NewPass123!',
      },
    },
  },
  'POST /api/user/{id}/suspend': {
    type: 'object',
    additionalProperties: false,
    required: ['reason'],
    properties: {
      reason: {
        type: 'string',
        minLength: 3,
        maxLength: 500,
        pattern: NON_BLANK_PATTERN,
        example: 'Repeated policy violations',
      },
      duration: {
        type: 'integer',
        minimum: 1,
        example: 7,
      },
    },
  },
  'POST /api/user/{id}/role': {
    type: 'object',
    additionalProperties: false,
    required: ['newRole'],
    properties: {
      newRole: {
        type: 'string',
        enum: ['buyer', 'seller', 'supplier', 'courier', 'enabler', 'system'],
      },
    },
  },
  'POST /api/user/{id}/phone/verify': {
    type: 'object',
    additionalProperties: false,
    required: ['phoneNumber', 'otp'],
    properties: {
      phoneNumber: {
        type: 'string',
        pattern: TANZANIA_MOBILE_PATTERN,
        example: VALID_E164_PHONE,
      },
      otp: {
        type: 'string',
        minLength: 6,
        maxLength: 6,
        pattern: '^\\d{6}$',
        example: '123456',
      },
      verificationMethod: {
        type: 'string',
        enum: ['otp', 'sms', 'call'],
      },
    },
  },
  'POST /api/user/{id}/2fa/setup': {
    type: 'object',
    additionalProperties: false,
    required: ['method'],
    properties: {
      method: {
        type: 'string',
        enum: ['totp', 'sms'],
      },
      deviceId: {
        type: 'string',
        minLength: 1,
        pattern: NON_BLANK_PATTERN,
      },
    },
  },
  'PUT /api/notification/templates/{id}': {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        pattern: NON_BLANK_PATTERN,
      },
      subject: {
        type: 'string',
      },
      bodyTemplate: {
        type: 'string',
      },
      variables: {
        type: 'array',
        items: {
          type: 'string',
          minLength: 1,
          pattern: NON_BLANK_PATTERN,
        },
      },
      isActive: {
        type: 'boolean',
      },
    },
  },
  'PUT /api/catalog/v1/products/{id}/category': {
    type: 'object',
    additionalProperties: false,
    required: ['categoryId'],
    properties: {
      categoryId: exactSystemIdSchema(CATEGORY_ID),
    },
  },
  'POST /api/business-registry/businesses/{id}/verify': {
    type: 'object',
    additionalProperties: false,
    required: ['verifiedBy', 'documentTypes'],
    properties: {
      verifiedBy: exactSystemIdSchema(PRIMARY_USER_ID),
      documentTypes: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'string',
          minLength: 1,
          pattern: NON_BLANK_PATTERN,
        },
      },
    },
  },
  'POST /api/business-registry/businesses/{id}/suspend': {
    type: 'object',
    additionalProperties: false,
    required: ['suspendedBy'],
    properties: {
      suspendedBy: exactSystemIdSchema(PRIMARY_USER_ID),
      reason: {
        type: 'string',
        maxLength: 500,
      },
    },
  },
  'POST /api/business-registry/{id}/verify': {
    type: 'object',
    additionalProperties: false,
    required: ['verifiedBy', 'documentTypes'],
    properties: {
      verifiedBy: exactSystemIdSchema(PRIMARY_USER_ID),
      documentTypes: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'string',
          minLength: 1,
          pattern: NON_BLANK_PATTERN,
        },
      },
    },
  },
  'POST /api/business-registry/{id}/suspend': {
    type: 'object',
    additionalProperties: false,
    required: ['suspendedBy'],
    properties: {
      suspendedBy: exactSystemIdSchema(PRIMARY_USER_ID),
      reason: {
        type: 'string',
        maxLength: 500,
      },
    },
  },
  'POST /api/payment/payments/webhooks/pesapal': {
    type: 'object',
    additionalProperties: true,
    required: ['OrderTrackingId'],
    properties: {
      OrderTrackingId: { type: 'string' },
      OrderMerchantReference: { type: 'string' },
      OrderNotificationType: { type: 'string' },
      status: { type: 'string' },
    },
  },
  'POST /api/payment/webhooks/pesapal': {
    type: 'object',
    additionalProperties: true,
    required: ['OrderTrackingId'],
    properties: {
      OrderTrackingId: { type: 'string' },
      OrderMerchantReference: { type: 'string' },
      OrderNotificationType: { type: 'string' },
      status: { type: 'string' },
    },
  },
};

const PARAMETER_SCHEMA_OVERRIDES = {
  'POST /api/business-registry/businesses/{id}/verify': {
    id: {
      in: 'path',
      required: true,
      schema: exactSystemIdSchema(BUSINESS_ID),
    },
  },
  'POST /api/business-registry/businesses/{id}/suspend': {
    id: {
      in: 'path',
      required: true,
      schema: exactSystemIdSchema(BUSINESS_ID),
    },
  },
  'POST /api/business-registry/{id}/verify': {
    id: {
      in: 'path',
      required: true,
      schema: exactSystemIdSchema(BUSINESS_ID),
    },
  },
  'POST /api/business-registry/{id}/suspend': {
    id: {
      in: 'path',
      required: true,
      schema: exactSystemIdSchema(BUSINESS_ID),
    },
  },
  'POST /api/enabler/enablers/{enablerId}/listings': {
    enablerId: {
      in: 'path',
      required: true,
      schema: exactSystemIdSchema(PRIMARY_USER_ID),
    },
  },
  'POST /api/enabler/enablers/{enablerId}/orders': {
    enablerId: {
      in: 'path',
      required: true,
      schema: exactSystemIdSchema(PRIMARY_USER_ID),
    },
  },
  'POST /api/wallet/wallets/{userId}/hold/{holdId}/capture': {
    userId: {
      in: 'path',
      required: true,
      schema: exactSystemIdSchema(PRIMARY_USER_ID),
    },
    holdId: {
      in: 'path',
      required: true,
      schema: exactSystemIdSchema(WALLET_HOLD_ID),
    },
  },
  'POST /api/wallet/wallets/{userId}/hold/{holdId}/release': {
    userId: {
      in: 'path',
      required: true,
      schema: exactSystemIdSchema(PRIMARY_USER_ID),
    },
    holdId: {
      in: 'path',
      required: true,
      schema: exactSystemIdSchema(WALLET_HOLD_ID),
    },
  },
  'POST /api/wallet/wallets/{userId}/topup': {
    userId: {
      in: 'path',
      required: true,
      schema: exactSystemIdSchema(PRIMARY_USER_ID),
    },
  },
  'POST /api/wallet/wallets/{userId}/payout': {
    userId: {
      in: 'path',
      required: true,
      schema: exactSystemIdSchema(PRIMARY_USER_ID),
    },
  },
  'POST /api/payment/payments/webhooks/pesapal': {
    'x-webhook-idempotency-key': {
      in: 'header',
      required: true,
      schema: {
        type: 'string',
        minLength: 1,
        example: 'webhook-contract-001',
      },
    },
  },
  'POST /api/payment/webhooks/pesapal': {
    'x-webhook-idempotency-key': {
      in: 'header',
      required: true,
      schema: {
        type: 'string',
        minLength: 1,
        example: 'webhook-contract-001',
      },
    },
  },
};

const SUCCESS_RESPONSE_OVERRIDES = {
  'POST /api/auth/2fa/setup': ['200'],
  'POST /api/auth/record-failure': ['200'],
  'POST /api/catalog/pricing/calculate': ['200'],
  'POST /api/compliance/audit-log': ['200'],
  'POST /api/compliance/manual-review': ['200'],
  'POST /api/compliance/monitor': ['200'],
  'POST /api/compliance/risk-assessment': ['200'],
  'POST /api/enabler/enablers/register': ['201'],
  'POST /api/logistics/api/v1/earnings': ['200'],
  'POST /api/logistics/api/v1/earnings/calculate': ['200'],
  'POST /api/logistics/api/v1/qa/load-test': ['200'],
  'POST /api/logistics/api/v1/routes/optimize': ['200'],
  'POST /api/logistics/api/v1/tracking/location': ['200'],
  'POST /api/notification/sms/send': ['201'],
  'POST /api/payment/payments': ['201'],
  'POST /api/production/quality/checkpoints': ['201'],
  'POST /api/training/api/v1/training/start': ['201']
};

const DOCUMENTED_RESPONSE_OVERRIDES = {
  'DELETE /api/auth/admin/sessions/{sessionId}': ['400']
};

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const readYaml = (file) => yaml.load(fs.readFileSync(file, 'utf8'));
const writeYaml = (file, doc) => {
  const dumped = yaml.dump(doc, {
    lineWidth: 140,
    noRefs: true,
    sortKeys: false,
  });
  fs.writeFileSync(file, dumped);
};

const cloneSecurity = (security) => security.map((requirement) => ({ ...requirement }));

const normalizeExample = (name) => {
  const base = String(name || 'param').trim();
  if (!base) return 'example';
  if (/page/i.test(base)) return 1;
  if (/limit/i.test(base)) return 20;
  if (/offset/i.test(base)) return 0;
  if (/price/i.test(base)) return 1000;
  if (/id$/i.test(base)) return `${base}-123`;
  if (/token/i.test(base)) return `${base}-example`;
  if (/email/i.test(base)) return 'test@example.com';
  if (/phone/i.test(base)) return '+255700000000';
  if (/tracking/i.test(base)) return 'MYS-TRACK-123';
  return `example-${base}`;
};

const ensureSchema = (param) => {
  if (!param.schema) param.schema = { type: 'string' };
  if (!param.schema.type) param.schema.type = 'string';
};

const ensureExample = (param) => {
  if (param.example !== undefined) return;
  if (param.examples !== undefined) return;
  if (param.schema && param.schema.example !== undefined) return;
  if (param.schema && param.schema.default !== undefined) return;
  if (param.default !== undefined) return;
  param.example = normalizeExample(param.name);
};

const normalizeParameterExample = (param) => {
  const normalized = normalizeExample(param.name);
  if (param.example === undefined || /^example(?:-|$)/i.test(String(param.example))) {
    param.example = normalized;
  }
};

const ensureParam = (params, param) => {
  const exists = params.some((p) => p && p.name === param.name && p.in === param.in);
  if (!exists) {
    params.push(param);
  }
};

const addOrPatchParam = (params, name, location, required = true) => {
  let param = params.find((p) => p && p.name === name && p.in === location);
  if (!param) {
    param = { name, in: location, required };
    params.push(param);
  }

  if (location === 'path') {
    param.required = true;
  }

  ensureSchema(param);
  ensureExample(param);
};

const splitRefPath = (ref) => String(ref || '')
  .replace(/^#\//, '')
  .split('/')
  .filter(Boolean)
  .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));

const resolveLocalRef = (doc, ref) => {
  if (typeof ref !== 'string' || !ref.startsWith('#/')) return null;

  let current = doc;
  for (const segment of splitRefPath(ref)) {
    if (!isPlainObject(current) && !Array.isArray(current)) return null;
    current = current?.[segment];
    if (current === undefined) return null;
  }

  return current ?? null;
};

const normalizeNumericExclusiveBounds = (value) => {
  if (Array.isArray(value)) {
    for (const item of value) normalizeNumericExclusiveBounds(item);
    return;
  }

  if (!isPlainObject(value)) return;

  if (typeof value.exclusiveMinimum === 'number') {
    value.minimum = typeof value.minimum === 'number'
      ? Math.max(value.minimum, value.exclusiveMinimum)
      : value.exclusiveMinimum;
    value.exclusiveMinimum = true;
  }

  if (typeof value.exclusiveMaximum === 'number') {
    value.maximum = typeof value.maximum === 'number'
      ? Math.min(value.maximum, value.exclusiveMaximum)
      : value.exclusiveMaximum;
    value.exclusiveMaximum = true;
  }

  for (const child of Object.values(value)) {
    normalizeNumericExclusiveBounds(child);
  }
};

const selectRequestMediaType = (content) => {
  if (!isPlainObject(content)) return null;
  if (isPlainObject(content['application/json'])) return content['application/json'];
  const preferredEntry = Object.values(content).find((mediaType) => isPlainObject(mediaType));
  return preferredEntry || null;
};

const ensureRequestMediaType = (operation) => {
  operation.requestBody = isPlainObject(operation.requestBody) ? operation.requestBody : {};
  operation.requestBody.required = true;
  operation.requestBody.content = isPlainObject(operation.requestBody.content) ? operation.requestBody.content : {};

  if (!isPlainObject(operation.requestBody.content['application/json'])) {
    const preferredEntry = selectRequestMediaType(operation.requestBody.content);
    operation.requestBody.content['application/json'] = isPlainObject(preferredEntry) ? deepClone(preferredEntry) : {};
  }

  return operation.requestBody.content['application/json'];
};

const patchNamedParameter = (params, name, override) => {
  if (!Array.isArray(params)) return false;

  let patched = false;
  for (const param of params) {
    if (!isPlainObject(param) || param.$ref || param.name !== name || param.in !== (override.in || 'path')) {
      continue;
    }

    param.required = param.in === 'path' ? true : Boolean(override.required);
    if (override.schema) {
      param.schema = deepClone(override.schema);
    }
    if (override.example !== undefined) {
      param.example = deepClone(override.example);
    }
    patched = true;
  }

  return patched;
};

const setGeneratedExample = (mediaType, example) => {
  const clonedExample = deepClone(example);
  const currentExample = mediaType.example !== undefined
    ? mediaType.example
    : mediaType.schema?.example;
  const shouldCountAsNew = mediaType[GENERATED_REQUEST_EXAMPLE_FLAG] !== true || !deepEqual(currentExample, clonedExample);

  mediaType.example = clonedExample;
  delete mediaType.examples;
  mediaType[GENERATED_REQUEST_EXAMPLE_FLAG] = true;

  return shouldCountAsNew;
};

const clampNumericExample = (schema, fallback) => {
  let value = fallback;

  if (typeof schema.minimum === 'number' && value < schema.minimum) {
    value = schema.minimum;
  }
  if (typeof schema.exclusiveMinimum === 'number' && value <= schema.exclusiveMinimum) {
    value = schema.exclusiveMinimum + 1;
  }
  if (typeof schema.maximum === 'number' && value > schema.maximum) {
    value = schema.maximum;
  }
  if (typeof schema.exclusiveMaximum === 'number' && value >= schema.exclusiveMaximum) {
    value = schema.exclusiveMaximum - 1;
  }

  return value;
};

const buildStringExample = (schema, name) => {
  const key = String(name || '').trim().toLowerCase();
  const format = String(schema?.format || '').toLowerCase();

  if (Array.isArray(schema?.enum) && schema.enum.length > 0) {
    if (key.includes('paymentmethod') && schema.enum.includes('WALLET')) return 'WALLET';
    if ((key === 'method' || key.endsWith('method')) && schema.enum.includes('MOBILE_MONEY')) return 'MOBILE_MONEY';
    if (key.includes('visibility') && schema.enum.includes('public')) return 'public';
    if (key.includes('type') && schema.enum.includes('text')) return 'text';
    return schema.enum[0];
  }
  if (schema?.const !== undefined) return schema.const;
  if (schema?.default !== undefined) return schema.default;
  if (schema?.example !== undefined) return schema.example;

  if (format === 'uuid') return '11111111-1111-4111-8111-111111111111';
  if (format === 'email' || key.includes('email')) return 'contract.user@example.com';
  if (format === 'uri' || format === 'url' || key.includes('url') || key.includes('website') || key.includes('link')) {
    return 'https://example.com/resource';
  }
  if (format === 'date-time' || key.includes('datetime')) return EXAMPLE_DATE_TIME;
  if (format === 'date') return EXAMPLE_DATE;

  if (key.includes('apikey')) return API_KEY_EXAMPLE;
  if (key.includes('buyerid') || key === 'userid' || key.endsWith('userid') || key.includes('learnerid')) return CONTRACT_USER_ID;
  if (key.includes('authorid') || key.includes('sellerid') || key.includes('ownerid') || key.includes('enablerid') || key.includes('supplierid') || key.includes('courierid')) return PRIMARY_USER_ID;
  if (key.includes('reviewerid')) return PRIMARY_USER_ID;
  if (key.includes('adminid') || key.includes('verifiedby') || key.includes('closedby') || key.includes('assignedby') || key.includes('requestedby') || key.includes('initiatedby')) return CONTRACT_USER_ID;
  if (key.includes('businessid')) return BUSINESS_ID;
  if (key.includes('orderid')) return ORDER_ID;
  if (key.includes('paymentid')) return PAYMENT_ID;
  if (key.includes('payoutid')) return PAYOUT_ID;
  if (key.includes('deliveryid') || key.includes('routeid') || key.includes('threadid') || key.includes('answerid') || key.includes('articleid') || key.includes('challengeid') || key.includes('templateid') || key.includes('actionid') || key.includes('messageid') || key.includes('sessionid')) {
    return DELIVERY_ID;
  }
  if (key.includes('productid')) return PRODUCT_ID;
  if (key.includes('categoryid')) return CATEGORY_ID;
  if (key.includes('moduleid')) return MODULE_ID;
  if (key.includes('ticketid')) return TICKET_ID;
  if (key.includes('walletid')) return 'wal_01KM5EEB6N51KM7JY8FSHRA4BH';
  if (key.includes('holdid')) return 'wal_hol_01KM5M7H34NV1M2HXZ07W407T8';
  if (key.includes('transactionid')) return 'wal_tra_01ARZ3NDEKTSV4RRFFQ69G5FAV';
  if (key === 'id' || key.endsWith('id')) return DELIVERY_ID;

  if (key.includes('token')) return 'token-example';
  if (key.includes('password')) return 'StrongPass123!';
  if (key.includes('registrationnumber')) return BUSINESS_REGISTRATION_NUMBER;
  if (key === 'tin' || key.includes('taxid')) return TAX_ID_EXAMPLE;
  if (key.includes('phone')) return VALID_E164_PHONE;
  if (key.includes('currency')) return 'TZS';
  if (key.includes('country')) return 'TZ';
  if (key.includes('postal') || key.includes('zipcode') || key.includes('postcode')) return '11101';
  if (key.includes('city')) return 'Dar es Salaam';
  if (key.includes('street') || key === 'address') return 'Uhuru Street';
  if (key.includes('tracking')) return 'MYS-TRACK-123';
  if (key.includes('otp') || key.includes('totp') || key.endsWith('code')) return '123456';
  if (key.includes('timezone')) return 'Africa/Dar_es_Salaam';
  if (key.includes('language') || key.includes('locale')) return 'en';
  if (key.includes('provider')) return 'MPESA';
  if (key.includes('query') || key === 'q') return 'example-q';
  if (key.includes('brand') || key.includes('name') || key.includes('title') || key.includes('subject')) return 'Contract Example';
  if (key.includes('description') || key.includes('content') || key.includes('message') || key.includes('note') || key.includes('reason')) return 'Contract example';
  if (key.includes('severity')) return 'high';
  if (key.includes('breachtype')) return 'suspicious_login';

  if (schema?.pattern) {
    if (schema.pattern === '^TZ-[A-Z]{2,4}-\\d{4,10}$') return BUSINESS_REGISTRATION_NUMBER;
    if (schema.pattern === '^\\d{9}$') return TAX_ID_EXAMPLE;
    if (/^\^\+\d+/.test(schema.pattern) || schema.pattern.includes('\\+')) return '+255700000101';
    if (schema.pattern.includes('@')) return 'contract.user@example.com';
  }

  return 'example';
};

const buildNumberExample = (schema, name) => {
  const key = String(name || '').trim().toLowerCase();

  if (schema?.const !== undefined) return schema.const;
  if (schema?.default !== undefined) return schema.default;
  if (schema?.example !== undefined) return schema.example;
  if (Array.isArray(schema?.enum) && schema.enum.length > 0) return schema.enum[0];

  if (key === 'lat' || key.includes('latitude')) return clampNumericExample(schema, -6.7924);
  if (key === 'lng' || key === 'lon' || key.includes('longitude')) return clampNumericExample(schema, 39.2083);
  if (key.includes('rate')) return clampNumericExample(schema, 0.05);
  if (key.includes('score')) return clampNumericExample(schema, 85);
  if (key.includes('percentage')) return clampNumericExample(schema, 50);
  if (key.includes('price') || key.includes('amount') || key.includes('cost') || key.includes('total') || key.includes('value')) {
    return clampNumericExample(schema, 1000);
  }
  if (key.includes('weight')) return clampNumericExample(schema, 1);
  if (key.includes('duration')) return clampNumericExample(schema, 5);
  if (key.includes('quantity') || key.includes('count') || key.includes('limit') || key.includes('page')) {
    return clampNumericExample(schema, 1);
  }
  if (key.includes('offset')) return clampNumericExample(schema, 0);

  return clampNumericExample(schema, schema?.type === 'integer' ? 1 : 1.5);
};

const pickObjectKeys = (properties, required) => {
  const propertyKeys = Object.keys(properties || {});
  if (propertyKeys.length === 0) return [];

  const requiredKeys = (Array.isArray(required) ? required : []).filter((key) => propertyKeys.includes(key));
  if (requiredKeys.length > 0) return [...new Set(requiredKeys)];

  return propertyKeys.slice(0, Math.min(propertyKeys.length, 4));
};

const mergeAllOfExamples = (parts) => {
  const definedParts = parts.filter((value) => value !== undefined);
  if (definedParts.length === 0) return undefined;

  if (definedParts.every((value) => isPlainObject(value))) {
    return Object.assign({}, ...definedParts);
  }

  return definedParts[definedParts.length - 1];
};

const buildExampleFromSchema = (schema, doc, context = {}, seenRefs = new Set()) => {
  if (!schema) return undefined;

  if (schema.$ref) {
    if (seenRefs.has(schema.$ref)) return undefined;
    const resolved = resolveLocalRef(doc, schema.$ref);
    if (!resolved) return undefined;

    const nextSeen = new Set(seenRefs);
    nextSeen.add(schema.$ref);
    return buildExampleFromSchema({ ...resolved, ...schema, $ref: undefined }, doc, context, nextSeen);
  }

  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.const !== undefined) return schema.const;
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return schema.enum[0];

  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    for (const option of schema.oneOf) {
      const example = buildExampleFromSchema(option, doc, context, seenRefs);
      if (example !== undefined) return example;
    }
  }

  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    for (const option of schema.anyOf) {
      const example = buildExampleFromSchema(option, doc, context, seenRefs);
      if (example !== undefined) return example;
    }
  }

  if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    return mergeAllOfExamples(
      schema.allOf.map((part) => buildExampleFromSchema(part, doc, context, seenRefs))
    );
  }

  const inferredType = schema.type
    || (schema.properties ? 'object' : undefined)
    || (schema.items ? 'array' : undefined)
    || (schema.additionalProperties ? 'object' : undefined);

  if (inferredType === 'object') {
    const properties = isPlainObject(schema.properties) ? schema.properties : {};
    const example = {};

    for (const key of pickObjectKeys(properties, schema.required)) {
      const value = buildExampleFromSchema(properties[key], doc, { ...context, name: key }, seenRefs);
      if (value !== undefined) example[key] = value;
    }

    if (Object.keys(example).length > 0) return example;

    if (schema.additionalProperties) {
      const value = buildExampleFromSchema(
        schema.additionalProperties === true ? { type: 'string' } : schema.additionalProperties,
        doc,
        { ...context, name: DEFAULT_OBJECT_PLACEHOLDER_KEY },
        seenRefs
      );
      if (value !== undefined) return { [DEFAULT_OBJECT_PLACEHOLDER_KEY]: value };
    }

    return {};
  }

  if (inferredType === 'array') {
    if (Array.isArray(schema.prefixItems) && schema.prefixItems.length > 0) {
      return schema.prefixItems
        .map((item, index) => buildExampleFromSchema(item, doc, { ...context, name: `${context.name || 'item'}${index}` }, seenRefs))
        .filter((value) => value !== undefined);
    }

    const itemExample = buildExampleFromSchema(schema.items || { type: 'string' }, doc, { ...context, name: context.name || 'item' }, seenRefs);
    return itemExample === undefined ? [] : [itemExample];
  }

  if (inferredType === 'integer') {
    return Math.trunc(buildNumberExample(schema, context.name));
  }

  if (inferredType === 'number') {
    return buildNumberExample(schema, context.name);
  }

  if (inferredType === 'boolean') {
    return true;
  }

  if (inferredType === 'string' || !inferredType) {
    return buildStringExample(schema, context.name);
  }

  if (inferredType === 'null') {
    return null;
  }

  return undefined;
};

const hasRequestExample = (mediaType) => (
  mediaType?.example !== undefined
  || (isPlainObject(mediaType?.examples) && Object.keys(mediaType.examples).length > 0)
  || mediaType?.schema?.example !== undefined
  || (isPlainObject(mediaType?.schema?.examples) && Object.keys(mediaType.schema.examples).length > 0)
);

const countGeneratedRequestExamples = (doc) => {
  let count = 0;

  for (const pathItem of Object.values(doc.paths || {})) {
    if (!isPlainObject(pathItem)) continue;

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!isPlainObject(operation)) continue;

      for (const mediaType of Object.values(operation.requestBody?.content || {})) {
        if (isPlainObject(mediaType) && mediaType[GENERATED_REQUEST_EXAMPLE_FLAG] === true) {
          count += 1;
        }
      }
    }
  }

  return count;
};

const applyRequestExampleOverrides = (doc) => {
  let backfilled = 0;

  for (const [operationKey, example] of Object.entries(REQUEST_EXAMPLE_OVERRIDES)) {
    const [method, ...pathParts] = operationKey.split(' ');
    const routePath = pathParts.join(' ');
    const operation = doc.paths?.[routePath]?.[method.toLowerCase()];
    if (!isPlainObject(operation)) continue;

    const mediaType = ensureRequestMediaType(operation);

    if (setGeneratedExample(mediaType, example)) {
      backfilled += 1;
    }
  }

  return backfilled;
};

const applyRequestSchemaOverrides = (doc) => {
  for (const [operationKey, schema] of Object.entries(REQUEST_SCHEMA_OVERRIDES)) {
    const [method, ...pathParts] = operationKey.split(' ');
    const routePath = pathParts.join(' ');
    const operation = doc.paths?.[routePath]?.[method.toLowerCase()];
    if (!isPlainObject(operation)) continue;

    const mediaType = ensureRequestMediaType(operation);
    mediaType.schema = deepClone(schema);
  }
};

const applyParameterSchemaOverrides = (doc) => {
  for (const [operationKey, overrides] of Object.entries(PARAMETER_SCHEMA_OVERRIDES)) {
    const [method, ...pathParts] = operationKey.split(' ');
    const routePath = pathParts.join(' ');
    const pathItem = doc.paths?.[routePath];
    const operation = pathItem?.[method.toLowerCase()];
    if (!isPlainObject(pathItem) || !isPlainObject(operation)) continue;

    for (const [name, override] of Object.entries(overrides || {})) {
      const patched = [
        patchNamedParameter(pathItem.parameters, name, override),
        patchNamedParameter(operation.parameters, name, override),
      ].some(Boolean);

      if (patched) continue;

      operation.parameters = Array.isArray(operation.parameters) ? operation.parameters : [];
      operation.parameters.push({
        name,
        in: override.in || 'path',
        required: (override.in || 'path') === 'path' ? true : Boolean(override.required),
        schema: deepClone(override.schema || { type: 'string' }),
        ...(override.example !== undefined ? { example: deepClone(override.example) } : {}),
      });
    }
  }
};

const normalizeRequestExamples = (doc) => {
  const stats = {
    generatedExamplesBackfilled: 0,
    generatedExamplesPresent: 0,
  };

  applyParameterSchemaOverrides(doc);
  applyRequestSchemaOverrides(doc);
  stats.generatedExamplesBackfilled += applyRequestExampleOverrides(doc);

  for (const [routePath, pathItem] of Object.entries(doc.paths || {})) {
    if (!isPlainObject(pathItem)) continue;

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!isPlainObject(operation)) continue;

      const content = operation.requestBody?.content;
      if (!isPlainObject(content)) continue;

      for (const [mediaTypeName, mediaType] of Object.entries(content)) {
        if (!isPlainObject(mediaType) || !mediaType.schema) continue;

        if (hasRequestExample(mediaType)) continue;

        const example = buildExampleFromSchema(mediaType.schema, doc, {
          method: method.toUpperCase(),
          path: routePath,
          name: mediaTypeName,
        });

        if (example === undefined) continue;

        if (setGeneratedExample(mediaType, example)) {
          stats.generatedExamplesBackfilled += 1;
        }
      }
    }
  }

  stats.generatedExamplesPresent = countGeneratedRequestExamples(doc);
  return stats;
};

const normalizeResponseSuccessStatuses = (doc) => {
  for (const [operationKey, desiredStatuses] of Object.entries(SUCCESS_RESPONSE_OVERRIDES)) {
    const [method, ...pathParts] = operationKey.split(' ');
    const routePath = pathParts.join(' ');
    const operation = doc.paths?.[routePath]?.[method.toLowerCase()];
    if (!isPlainObject(operation)) continue;

    operation.responses = isPlainObject(operation.responses) ? operation.responses : {};
    const existingSuccessStatus = Object.keys(operation.responses).find((statusCode) => /^2\d\d$/.test(statusCode));
    const templateResponse = existingSuccessStatus
      ? deepClone(operation.responses[existingSuccessStatus])
      : { description: 'Success', content: { 'application/json': { schema: {} } } };

    for (const statusCode of desiredStatuses) {
      if (!operation.responses[statusCode]) {
        operation.responses[statusCode] = deepClone(templateResponse);
      }
    }
  }
};

const ensureDocumentedResponseStatuses = (doc) => {
  for (const [operationKey, desiredStatuses] of Object.entries(DOCUMENTED_RESPONSE_OVERRIDES)) {
    const [method, ...pathParts] = operationKey.split(' ');
    const routePath = pathParts.join(' ');
    const operation = doc.paths?.[routePath]?.[method.toLowerCase()];
    if (!isPlainObject(operation)) continue;
    if (!isPlainObject(operation.responses)) operation.responses = {};

    const templateResponse = deepClone(
      operation.responses['400']
      || operation.responses['422']
      || operation.responses['500']
      || Object.values(operation.responses)[0]
      || { description: 'Response' }
    );

    for (const statusCode of desiredStatuses) {
      if (!operation.responses[statusCode]) {
        operation.responses[statusCode] = deepClone(templateResponse);
      }
    }
  }
};

const removeSafeMethodRequestBodies = (doc) => {
  for (const pathItem of Object.values(doc.paths || {})) {
    if (!isPlainObject(pathItem)) continue;

    for (const method of ['get', 'head']) {
      const operation = pathItem[method];
      if (!isPlainObject(operation) || !operation.requestBody) continue;

      delete operation.requestBody;
    }
  }
};

const hasPathPrefix = (routePath, prefix) => routePath === prefix || routePath.startsWith(`${prefix}/`);

const usesMethod = (method, expected) => method === expected.toUpperCase();

const classifyAuthSecurity = (method, routePath) => {
  if (hasPathPrefix(routePath, '/api/auth/system/maintenance')) return BEARER_OR_SERVICE_SECURITY;
  if (hasPathPrefix(routePath, '/api/auth/sessions/health')) return PUBLIC_SECURITY;
  if (hasPathPrefix(routePath, '/api/auth/health')) return PUBLIC_SECURITY;
  if (hasPathPrefix(routePath, '/api/auth/oauth')) return PUBLIC_SECURITY;
  if (hasPathPrefix(routePath, '/api/auth/2fa')) return PUBLIC_SECURITY;
  if (hasPathPrefix(routePath, '/api/auth/admin')) return BEARER_SECURITY;
  if (routePath === '/api/auth/sessions' || hasPathPrefix(routePath, '/api/auth/sessions')) return BEARER_SECURITY;
  if (routePath === '/api/auth/verify') return BEARER_SECURITY;
  if (AUTH_PUBLIC_EXACT_PATHS.has(routePath)) return PUBLIC_SECURITY;
  return null;
};

const classifyCatalogSecurity = (method, routePath) => {
  if (hasPathPrefix(routePath, '/api/catalog/system/maintenance')) return BEARER_OR_SERVICE_SECURITY;
  if (hasPathPrefix(routePath, '/api/catalog/health')) return PUBLIC_SECURITY;
  if (hasPathPrefix(routePath, '/api/catalog/pricing/health')) return PUBLIC_SECURITY;
  if (hasPathPrefix(routePath, '/api/catalog/campaigns')) return PUBLIC_SECURITY;
  if (usesMethod(method, 'GET') && CATALOG_PUBLIC_GET_PATHS.has(routePath)) return PUBLIC_SECURITY;
  if (usesMethod(method, 'POST') && CATALOG_PUBLIC_POST_PATHS.has(routePath)) return PUBLIC_SECURITY;
  if (hasPathPrefix(routePath, '/api/catalog/match')) return BEARER_SECURITY;
  if (routePath === '/api/catalog/sellers/{sellerId}/share-url') return BEARER_SECURITY;
  if (hasPathPrefix(routePath, '/api/catalog/v1/products')) return BEARER_SECURITY;
  if (hasPathPrefix(routePath, '/api/catalog/v1/pricing')) return BEARER_SECURITY;
  return null;
};

const classifyCommunitySecurity = (method, routePath) => {
  if (hasPathPrefix(routePath, '/api/community/system/maintenance')) return BEARER_OR_SERVICE_SECURITY;
  if (routePath === '/api/community/health' || routePath === '/api/community/metrics') return PUBLIC_SECURITY;
  if (usesMethod(method, 'GET') && COMMUNITY_PUBLIC_GET_PATHS.has(routePath)) return PUBLIC_SECURITY;

  if (routePath === '/api/community/challenges') return BEARER_SECURITY;
  if (hasPathPrefix(routePath, '/api/community/challenges/{challengeId}/solutions')) return BEARER_SECURITY;
  if (routePath === '/api/community/discover') return BEARER_SECURITY;
  if (routePath === '/api/community/discussions') return BEARER_SECURITY;
  if (hasPathPrefix(routePath, '/api/community/discussions/{threadId}/accept')) return BEARER_SECURITY;
  if (hasPathPrefix(routePath, '/api/community/discussions/{threadId}/answers')) return BEARER_SECURITY;
  if (hasPathPrefix(routePath, '/api/community/discussions/{threadId}/close')) return BEARER_SECURITY;
  if (routePath === '/api/community/expertise/validate') return BEARER_SECURITY;
  if (routePath === '/api/community/knowledge/articles') return BEARER_SECURITY;
  if (hasPathPrefix(routePath, '/api/community/knowledge/articles/{articleId}/publish')) return BEARER_SECURITY;
  if (hasPathPrefix(routePath, '/api/community/knowledge/articles/{articleId}/reviews')) return BEARER_SECURITY;
  if (routePath === '/api/community/posts') return BEARER_SECURITY;
  if (hasPathPrefix(routePath, '/api/community/posts/users/{userId}/feed')) return BEARER_SECURITY;
  return null;
};

const classifyNotificationSecurity = (routePath) => {
  if (hasPathPrefix(routePath, '/api/notification/system/maintenance')) return BEARER_OR_SERVICE_SECURITY;
  if (routePath === '/api/notification/health-summary') return PUBLIC_SECURITY;
  if (hasPathPrefix(routePath, '/api/notification/health')) return PUBLIC_SECURITY;
  if (hasPathPrefix(routePath, '/api/notification/sms/health')) return PUBLIC_SECURITY;
  if (routePath === '/api/notification/sms/webhook/africastalking') return PUBLIC_SECURITY;
  if (
    hasPathPrefix(routePath, '/api/notification/notifications')
    || hasPathPrefix(routePath, '/api/notification/preferences')
    || hasPathPrefix(routePath, '/api/notification/templates')
    || hasPathPrefix(routePath, '/api/notification/sms')
  ) {
    return BEARER_SECURITY;
  }
  return null;
};

const classifyPaymentSecurity = (routePath) => {
  if (hasPathPrefix(routePath, '/api/payment/system/maintenance')) return BEARER_OR_SERVICE_SECURITY;
  if (hasPathPrefix(routePath, '/api/payment/health')) return PUBLIC_SECURITY;
  if (routePath === '/api/payment/metrics') return PUBLIC_SECURITY;
  if (PAYMENT_PUBLIC_PREFIXES.some((prefix) => hasPathPrefix(routePath, prefix))) return PUBLIC_SECURITY;
  if (hasPathPrefix(routePath, '/api/payment/payments')) {
    return BEARER_SECURITY;
  }
  return null;
};

const classifyTrainingSecurity = (method, routePath) => {
  if (routePath === '/api/training/metrics') return PUBLIC_SECURITY;
  if (hasPathPrefix(routePath, '/api/training/api/health')) return PUBLIC_SECURITY;
  if (usesMethod(method, 'GET') && hasPathPrefix(routePath, '/api/training/api/v1/modules')) return PUBLIC_SECURITY;
  if (hasPathPrefix(routePath, '/api/training/api/v1/training')) return BEARER_SECURITY;
  return null;
};

const classifyUserSecurity = (method, routePath) => {
  if (hasPathPrefix(routePath, '/api/user/system/maintenance')) return BEARER_OR_SERVICE_SECURITY;
  if (hasPathPrefix(routePath, '/api/user/health')) return PUBLIC_SECURITY;
  if (routePath === '/api/user/lookup' || routePath === '/api/user/search') return INTERNAL_CALL_SECURITY;
  if (usesMethod(method, 'POST') && routePath === '/api/user') return PUBLIC_SECURITY;
  if (usesMethod(method, 'POST') && routePath === '/api/user/request-password-reset') return PUBLIC_SECURITY;
  if (usesMethod(method, 'POST') && routePath === '/api/user/reset-password/{token}') return PUBLIC_SECURITY;
  if (usesMethod(method, 'POST') && routePath === '/api/user/verify-email/{token}') return PUBLIC_SECURITY;
  if (hasPathPrefix(routePath, '/api/user')) return BEARER_SECURITY;
  return null;
};

const classifyServiceSecurity = (method, routePath) => {
  if (ROOT_PUBLIC_PATHS.has(routePath)) return PUBLIC_SECURITY;

  if (hasPathPrefix(routePath, '/api/analytics')) {
    if (routePath === '/api/analytics/health' || routePath === '/api/analytics/metrics') return PUBLIC_SECURITY;
    return BEARER_SECURITY;
  }

  if (hasPathPrefix(routePath, '/api/auth')) return classifyAuthSecurity(method, routePath);

  if (hasPathPrefix(routePath, '/api/business-registry')) {
    if (hasPathPrefix(routePath, '/api/business-registry/system/maintenance')) return BEARER_OR_SERVICE_SECURITY;
    if (hasPathPrefix(routePath, '/api/business-registry/health')) return PUBLIC_SECURITY;
    return BEARER_SECURITY;
  }

  if (hasPathPrefix(routePath, '/api/catalog')) return classifyCatalogSecurity(method, routePath);

  if (hasPathPrefix(routePath, '/api/checkout')) {
    if (hasPathPrefix(routePath, '/api/checkout/system/maintenance')) return BEARER_OR_SERVICE_SECURITY;
    if (hasPathPrefix(routePath, '/api/checkout/health') || routePath === '/api/checkout/metrics') return PUBLIC_SECURITY;
    return BEARER_SECURITY;
  }

  if (hasPathPrefix(routePath, '/api/commission')) {
    if (hasPathPrefix(routePath, '/api/commission/health')) return PUBLIC_SECURITY;
    return BEARER_SECURITY;
  }

  if (hasPathPrefix(routePath, '/api/community')) return classifyCommunitySecurity(method, routePath);

  if (hasPathPrefix(routePath, '/api/compliance')) {
    if (routePath === '/api/compliance/metrics') return PUBLIC_SECURITY;
    return BEARER_SECURITY;
  }

  if (hasPathPrefix(routePath, '/api/enabler')) {
    if (hasPathPrefix(routePath, '/api/enabler/system/maintenance')) return BEARER_OR_SERVICE_SECURITY;
    return BEARER_SECURITY;
  }

  if (hasPathPrefix(routePath, '/api/inventory')) {
    if (hasPathPrefix(routePath, '/api/inventory/system/maintenance')) return BEARER_OR_SERVICE_SECURITY;
    if (hasPathPrefix(routePath, '/api/inventory/health')) return PUBLIC_SECURITY;
    return null;
  }

  if (hasPathPrefix(routePath, '/api/logistics')) {
    if (hasPathPrefix(routePath, '/api/logistics/system/maintenance')) return BEARER_OR_SERVICE_SECURITY;
    if (hasPathPrefix(routePath, '/api/logistics/health')) return PUBLIC_SECURITY;
    return BEARER_SECURITY;
  }

  if (hasPathPrefix(routePath, '/api/maps')) {
    if (hasPathPrefix(routePath, '/api/maps/health')) return PUBLIC_SECURITY;
    return null;
  }

  if (hasPathPrefix(routePath, '/api/notification')) return classifyNotificationSecurity(routePath);

  if (hasPathPrefix(routePath, '/api/order')) {
    if (hasPathPrefix(routePath, '/api/order/system/maintenance')) return BEARER_OR_SERVICE_SECURITY;
    if (hasPathPrefix(routePath, '/api/order/health')) return PUBLIC_SECURITY;
    return BEARER_SECURITY;
  }

  if (hasPathPrefix(routePath, '/api/payment')) return classifyPaymentSecurity(routePath);

  if (hasPathPrefix(routePath, '/api/payout')) {
    if (hasPathPrefix(routePath, '/api/payout/system/maintenance')) return BEARER_OR_SERVICE_SECURITY;
    return BEARER_SECURITY;
  }

  if (hasPathPrefix(routePath, '/api/production')) {
    return BEARER_SECURITY;
  }

  if (hasPathPrefix(routePath, '/api/support')) {
    if (hasPathPrefix(routePath, '/api/support/system/maintenance')) return BEARER_OR_SERVICE_SECURITY;
    return BEARER_SECURITY;
  }

  if (hasPathPrefix(routePath, '/api/training')) return classifyTrainingSecurity(method, routePath);

  if (hasPathPrefix(routePath, '/api/user')) return classifyUserSecurity(method, routePath);

  if (hasPathPrefix(routePath, '/api/wallet')) {
    if (hasPathPrefix(routePath, '/api/wallet/system/maintenance')) return BEARER_OR_SERVICE_SECURITY;
    if (hasPathPrefix(routePath, '/api/wallet/health')) return PUBLIC_SECURITY;
    return BEARER_SECURITY;
  }

  return null;
};

const normalizePaths = (doc) => {
  const paths = doc.paths || {};
  const newPaths = {};

  const pathKeys = Object.keys(paths);
  for (const pathKey of pathKeys) {
    const pathItem = paths[pathKey] || {};
    const templateMatches = [...pathKey.matchAll(/\{\?([^}]+)\}/g)];
    const queryParams = templateMatches.flatMap((match) => match[1].split(',').map((value) => value.trim()).filter(Boolean));
    const cleanPath = pathKey.replace(/\{\?[^}]+\}/g, '');

    if (!newPaths[cleanPath]) newPaths[cleanPath] = {};

    const target = newPaths[cleanPath];
    const mergeKeys = Object.keys(pathItem);
    for (const key of mergeKeys) {
      if (key === 'parameters') {
        target.parameters = Array.isArray(target.parameters) ? target.parameters : [];
        for (const param of pathItem.parameters || []) {
          ensureParam(target.parameters, param);
        }
      } else {
        target[key] = pathItem[key];
      }
    }

    const pathParams = [...cleanPath.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
    target.parameters = Array.isArray(target.parameters) ? target.parameters : [];

    for (const paramName of pathParams) {
      addOrPatchParam(target.parameters, paramName, 'path', true);
    }

    for (const queryParam of queryParams) {
      addOrPatchParam(target.parameters, queryParam, 'query', false);
    }

    for (const method of HTTP_METHODS) {
      if (!target[method]) continue;

      const operation = target[method];
      operation.parameters = Array.isArray(operation.parameters) ? operation.parameters : [];

      for (const paramName of pathParams) {
        addOrPatchParam(operation.parameters, paramName, 'path', true);
      }

      for (const queryParam of queryParams) {
        addOrPatchParam(operation.parameters, queryParam, 'query', false);
      }

      for (const param of operation.parameters) {
        if (!param) continue;
        ensureSchema(param);
        ensureExample(param);
        normalizeParameterExample(param);
        if (param.in === 'path') param.required = true;
      }
    }
  }

  doc.paths = newPaths;
};

const ensureSecuritySchemes = (doc) => {
  doc.components = isPlainObject(doc.components) ? doc.components : {};
  doc.components.securitySchemes = isPlainObject(doc.components.securitySchemes) ? doc.components.securitySchemes : {};

  doc.components.securitySchemes.BearerAuth = {
    ...(isPlainObject(doc.components.securitySchemes.BearerAuth) ? doc.components.securitySchemes.BearerAuth : {}),
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'JWT bearer token for authenticated user requests.',
  };

  doc.components.securitySchemes.ServiceKey = {
    type: 'apiKey',
    in: 'header',
    name: 'X-Service-Key',
    description: 'Trusted service key for internal maintenance or system operations.',
  };

  doc.components.securitySchemes.InternalCall = {
    type: 'apiKey',
    in: 'header',
    name: 'x-internal-call',
    description: 'Internal caller header for service-to-service endpoints.',
  };

  delete doc.components.securitySchemes.ContractTestBypass;
};

const applyExplicitSecurity = (doc) => {
  const unclassifiedOperations = [];
  const stats = {
    public: 0,
    protected: 0,
    serviceOrBearer: 0,
    internal: 0,
  };

  delete doc.security;

  const paths = doc.paths || {};
  for (const [routePath, pathItem] of Object.entries(paths)) {
    if (!isPlainObject(pathItem)) continue;

    delete pathItem.security;

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!isPlainObject(operation)) continue;

      const methodName = method.toUpperCase();
      const security = classifyServiceSecurity(methodName, routePath);

      if (!Array.isArray(security)) {
        unclassifiedOperations.push(`${methodName} ${routePath}`);
        continue;
      }

      operation.security = cloneSecurity(security);

      if (security.length === 0) {
        stats.public += 1;
      } else if (security.some((requirement) => Object.prototype.hasOwnProperty.call(requirement, 'InternalCall'))) {
        stats.internal += 1;
      } else if (security.some((requirement) => Object.prototype.hasOwnProperty.call(requirement, 'ServiceKey'))) {
        stats.serviceOrBearer += 1;
      } else {
        stats.protected += 1;
      }
    }
  }

  return { stats, unclassifiedOperations };
};

const removeStaleOperations = (doc) => {
  const staleOperations = [
    ['post', '/api/business-registry'],
    ['post', '/api/wallet/wallets'],
  ];

  for (const [method, routePath] of staleOperations) {
    const pathItem = doc.paths?.[routePath];
    if (!isPlainObject(pathItem) || !pathItem[method]) continue;

    delete pathItem[method];

    const remainingKeys = Object.keys(pathItem).filter((key) => key !== 'parameters');
    if (remainingKeys.length === 0) {
      delete doc.paths[routePath];
    }
  }
};

const OPENAPI_NORMALIZATION_TRANSFORMS = Object.freeze([
  {
    name: 'normalize-paths',
    apply: (doc) => normalizePaths(doc),
  },
  {
    name: 'remove-stale-operations',
    apply: (doc) => removeStaleOperations(doc),
  },
  {
    name: 'normalize-numeric-exclusive-bounds',
    apply: (doc) => normalizeNumericExclusiveBounds(doc),
  },
  {
    name: 'ensure-security-schemes',
    apply: (doc) => ensureSecuritySchemes(doc),
  },
  {
    name: 'apply-explicit-security',
    apply: (doc) => applyExplicitSecurity(doc),
  },
  {
    name: 'normalize-response-success-statuses',
    apply: (doc) => normalizeResponseSuccessStatuses(doc),
  },
  {
    name: 'ensure-documented-response-statuses',
    apply: (doc) => ensureDocumentedResponseStatuses(doc),
  },
  {
    name: 'remove-safe-method-request-bodies',
    apply: (doc) => removeSafeMethodRequestBodies(doc),
  },
  {
    name: 'normalize-request-examples',
    apply: (doc) => ({
      exampleStats: normalizeRequestExamples(doc),
    }),
  },
]);

const OPENAPI_NORMALIZATION_TRANSFORM_NAMES = Object.freeze(
  OPENAPI_NORMALIZATION_TRANSFORMS.map((transform) => transform.name)
);

const normalizeOpenApiDocument = (doc, transforms = OPENAPI_NORMALIZATION_TRANSFORMS) =>
  runTransformPipeline(doc, transforms, createDefaultNormalizationResult());

const normalizeOpenApiFile = (openApiPath = defaultOpenApiPath) => {
  const doc = readYaml(openApiPath);
  const result = normalizeOpenApiDocument(doc);

  if (result.unclassifiedOperations.length > 0) {
    const preview = result.unclassifiedOperations.slice(0, 25).join('\n- ');
    throw new Error(
      `OpenAPI security normalization left ${result.unclassifiedOperations.length} operations unclassified.\n- ${preview}`
    );
  }

  writeYaml(openApiPath, doc);
  return result;
};

if (require.main === module) {
  const openApiPath = path.resolve(process.argv[2] || defaultOpenApiPath);
  const result = normalizeOpenApiFile(openApiPath);

  console.log('Normalized OpenAPI path parameters, URI templates, explicit security, and request examples.');
  console.log(`- Public operations: ${result.stats.public}`);
  console.log(`- Bearer-protected operations: ${result.stats.protected}`);
  console.log(`- Bearer-or-service operations: ${result.stats.serviceOrBearer}`);
  console.log(`- Internal-call operations: ${result.stats.internal}`);
  console.log(`- Generated request examples present: ${result.exampleStats.generatedExamplesPresent}`);
  console.log(`- Request examples backfilled this run: ${result.exampleStats.generatedExamplesBackfilled}`);
}

module.exports = {
  OPENAPI_NORMALIZATION_TRANSFORMS,
  OPENAPI_NORMALIZATION_TRANSFORM_NAMES,
  normalizeOpenApiDocument,
  normalizeOpenApiFile,
  normalizePaths,
  removeSafeMethodRequestBodies,
};
