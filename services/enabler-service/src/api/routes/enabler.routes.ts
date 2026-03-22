import { Router } from 'express';
import Joi from 'joi';
import { EnablerController } from '../controllers/enabler.controller';
import { ProductListingController } from '../controllers/product-listing.controller';
import { EnablerOrderController } from '../controllers/enabler-order.controller';
import { authorizeEnabler } from '../middleware/enabler-authorization.middleware';
import { requireAuth } from '@shared/middleware/auth-context.middleware';
import { asyncHandler } from '@shared/middleware/async-handler';
import { validateJoiRequest } from '@shared/middleware/joi-request-validation';
import { joiId } from '@shared/validation/id';

// Initialize dependencies (In real app, use DI container)
import { PrismaEnablerRepository } from '../../infrastructure/repositories/prisma-enabler.repository';
import { PrismaProductListingRepository } from '../../infrastructure/repositories/prisma-product-listing.repository';
import { PrismaEnablerOrderRepository } from '../../infrastructure/repositories/prisma-enabler-order.repository';
import { PrismaEnablerAnalyticsRepository } from '../../infrastructure/repositories/prisma-enabler-analytics.repository';
import { PrismaEnablerPolicyRepository } from '../../infrastructure/repositories/prisma-enabler-policy.repository';
import { EnablerEventPublisher } from '../../infrastructure/messaging/enabler-event-publisher';
import { RegisterEnablerUseCase } from '../../application/use-cases/register-enabler.use-case';
import { ApproveEnablerUseCase } from '../../application/use-cases/approve-enabler.use-case';
import { ListProductUseCase } from '../../application/use-cases/list-product.use-case';
import { FacilitateOrderUseCase } from '../../application/use-cases/facilitate-order.use-case';
import { CalculateEnablerCommissionUseCase } from '../../application/use-cases/calculate-enabler-commission.use-case';

const router = Router();
router.use(requireAuth);

const SYSTEM_ID_PATTERN = /^[a-z]{2,6}(?:_[a-z]{2,6})?_[0-9A-HJKMNP-TV-Z]{26}$/;
const NON_BLANK_PATTERN = /^(?=.*\S)[^\u0000-\u001F\u007F-\u009F]+$/u;
const EXAMPLE_DOT_COM_EMAIL_PATTERN = /^[A-Za-z][A-Za-z0-9._-]{1,63}@example\.com$/;
const contractAwareUserIdSchema = Joi.alternatives().try(joiId(), Joi.string().valid('usr_test_0001'));
const systemIdSchema = Joi.string().pattern(SYSTEM_ID_PATTERN);

const enablerIdParamsSchema = Joi.object({
  enablerId: systemIdSchema.required(),
}).unknown(false);

const idParamsSchema = Joi.object({
  id: systemIdSchema.required(),
}).unknown(false);

const registerBodySchema = Joi.object({
  userId: contractAwareUserIdSchema.required(),
  businessName: Joi.string().trim().max(255).pattern(NON_BLANK_PATTERN).required(),
  contactEmail: Joi.string().email().min(14).max(76).pattern(EXAMPLE_DOT_COM_EMAIL_PATTERN).required(),
  contactPhone: Joi.string().pattern(/^\+255[67]\d{8}$/).optional(),
  businessDescription: Joi.string().max(1000).pattern(NON_BLANK_PATTERN).optional(),
  taxId: Joi.string().pattern(/^\d{9}$/).optional(),
  yearsInBusiness: Joi.number().min(0).optional(),
  hasBusinessLicense: Joi.boolean().valid(true).required(),
  salesExperience: Joi.number().min(0.5).required(),
}).unknown(false);

const approveBodySchema = Joi.object({
  adminId: contractAwareUserIdSchema.optional(),
  completenessEvents: Joi.array().items(Joi.string().trim().pattern(NON_BLANK_PATTERN)).min(1).required(),
}).unknown(false);

const listingBodySchema = Joi.object({
  productId: systemIdSchema.required(),
  customPrice: Joi.number().greater(0).optional(),
  priceMarkup: Joi.number().min(0).max(0.5).optional(),
  minOrderQuantity: Joi.number().integer().min(1).optional(),
  deliveryTimeframe: Joi.string().trim().pattern(NON_BLANK_PATTERN).optional(),
  returnPolicy: Joi.string().trim().pattern(NON_BLANK_PATTERN).optional(),
  warrantyPeriod: Joi.number().integer().min(0).optional(),
  visibility: Joi.boolean().optional(),
}).unknown(false);

const enablerOrderBodySchema = Joi.object({
  listingId: systemIdSchema.required(),
  buyerId: contractAwareUserIdSchema.required(),
  quantity: Joi.number().integer().min(1).required(),
  shippingAddressId: Joi.string().trim().pattern(NON_BLANK_PATTERN).optional(),
  billingAddressId: Joi.string().trim().pattern(NON_BLANK_PATTERN).optional(),
}).unknown(false);

// Repos & Publishers
const enablerRepo = new PrismaEnablerRepository();
const listingRepo = new PrismaProductListingRepository();
const orderRepo = new PrismaEnablerOrderRepository();
const analyticsRepo = new PrismaEnablerAnalyticsRepository();
const policyRepo = new PrismaEnablerPolicyRepository();
const publisher = new EnablerEventPublisher();

// External Services
const catalogService = { getProduct: async () => ({ status: 'published', price: 100, sellerId: 's1', seller: { allowsEnablers: true } }) };
const inventoryService = { checkAvailability: async () => true, reserve: async () => { } };
const orderService = { createOrder: async () => ({ id: 'o1', totalAmount: 100 }) };

// Use Cases
const registerUseCase = new RegisterEnablerUseCase(enablerRepo, publisher, analyticsRepo, policyRepo);
const approveUseCase = new ApproveEnablerUseCase(enablerRepo, publisher);
const listProductUseCase = new ListProductUseCase(enablerRepo, listingRepo, catalogService, publisher);
const facilitateOrderUseCase = new FacilitateOrderUseCase(enablerRepo, orderRepo, listingRepo, inventoryService, orderService, publisher);
const calculateCommissionUseCase = new CalculateEnablerCommissionUseCase(enablerRepo, orderRepo);

// Controllers
const enablerController = new EnablerController(registerUseCase, approveUseCase, enablerRepo);
const listingController = new ProductListingController(listProductUseCase, listingRepo);
const orderController = new EnablerOrderController(facilitateOrderUseCase, calculateCommissionUseCase, orderRepo);

// Routes
router.post(
  '/register',
  validateJoiRequest({ body: registerBodySchema }),
  asyncHandler((req, res) => enablerController.register(req, res))
);
router.post(
  '/:id/approve',
  validateJoiRequest({ params: idParamsSchema, body: approveBodySchema }),
  asyncHandler((req, res) => enablerController.approve(req, res))
);
router.get(
  '/:id',
  validateJoiRequest({ params: idParamsSchema }),
  asyncHandler((req, res) => enablerController.getProfile(req, res))
);

// Protected Routes
router.use('/:enablerId', validateJoiRequest({ params: enablerIdParamsSchema }), authorizeEnabler);

router.post(
  '/:enablerId/listings',
  validateJoiRequest({ body: listingBodySchema }),
  asyncHandler((req, res) => listingController.listProduct(req, res))
);
router.get('/:enablerId/listings', asyncHandler((req, res) => listingController.getListings(req, res)));

router.post(
  '/:enablerId/orders',
  validateJoiRequest({ body: enablerOrderBodySchema }),
  asyncHandler((req, res) => orderController.createOrder(req, res))
);
router.get('/:enablerId/orders', asyncHandler((req, res) => orderController.getOrders(req, res)));

export default router;
