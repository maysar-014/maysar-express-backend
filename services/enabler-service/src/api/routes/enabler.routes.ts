import { Router } from 'express';
import { EnablerController } from '../controllers/enabler.controller';
import { ProductListingController } from '../controllers/product-listing.controller';
import { EnablerOrderController } from '../controllers/enabler-order.controller';
import { authorizeEnabler } from '../middleware/enabler-authorization.middleware';

// Initialize dependencies (In real app, use DI container)
import { PrismaEnablerRepository } from '../../infrastructure/repositories/prisma-enabler.repository';
import { PrismaProductListingRepository } from '../../infrastructure/repositories/prisma-product-listing.repository';
import { PrismaEnablerOrderRepository } from '../../infrastructure/repositories/prisma-enabler-order.repository';
import { EnablerEventPublisher } from '../../infrastructure/messaging/enabler-event-publisher';
import { RegisterEnablerUseCase } from '../../application/use-cases/register-enabler.use-case';
import { ApproveEnablerUseCase } from '../../application/use-cases/approve-enabler.use-case';
import { ListProductUseCase } from '../../application/use-cases/list-product.use-case';
import { FacilitateOrderUseCase } from '../../application/use-cases/facilitate-order.use-case';
import { CalculateEnablerCommissionUseCase } from '../../application/use-cases/calculate-enabler-commission.use-case';

const router = Router();

// Repos & Publishers
const enablerRepo = new PrismaEnablerRepository();
const listingRepo = new PrismaProductListingRepository();
const orderRepo = new PrismaEnablerOrderRepository();
const publisher = new EnablerEventPublisher();

// Mock External Services
const catalogService = { getProduct: async () => ({ status: 'published', price: 100, sellerId: 's1', seller: { allowsEnablers: true } }) };
const inventoryService = { checkAvailability: async () => true, reserve: async () => { } };
const orderService = { createOrder: async () => ({ id: 'o1', totalAmount: 100 }) };

// Use Cases
const registerUseCase = new RegisterEnablerUseCase(enablerRepo, publisher);
const approveUseCase = new ApproveEnablerUseCase(enablerRepo, publisher);
const listProductUseCase = new ListProductUseCase(enablerRepo, listingRepo, catalogService, publisher);
const facilitateOrderUseCase = new FacilitateOrderUseCase(enablerRepo, orderRepo, listingRepo, inventoryService, orderService, publisher);
const calculateCommissionUseCase = new CalculateEnablerCommissionUseCase(enablerRepo, orderRepo);

// Controllers
const enablerController = new EnablerController(registerUseCase, approveUseCase, enablerRepo);
const listingController = new ProductListingController(listProductUseCase, listingRepo);
const orderController = new EnablerOrderController(facilitateOrderUseCase, calculateCommissionUseCase, orderRepo);

// Routes
router.post('/register', (req, res) => enablerController.register(req, res));
router.post('/:id/approve', (req, res) => enablerController.approve(req, res));
router.get('/:id', (req, res) => enablerController.getProfile(req, res));

// Protected Routes
router.use('/:enablerId', authorizeEnabler);

router.post('/:enablerId/listings', (req, res) => listingController.listProduct(req, res));
router.get('/:enablerId/listings', (req, res) => listingController.getListings(req, res));

router.post('/:enablerId/orders', (req, res) => orderController.createOrder(req, res));
router.get('/:enablerId/orders', (req, res) => orderController.getOrders(req, res));

export default router;
