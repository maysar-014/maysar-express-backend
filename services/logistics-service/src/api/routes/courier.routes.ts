import { Router } from 'express';
import { CourierController } from '../controllers/courier.controller';
import { IdempotencyMiddleware } from '@shared/middleware/idempotency';
import { asyncHandler } from '@shared/middleware/async-handler';

const router = Router();
const courierController = new CourierController();
const idempotencyMiddleware = new IdempotencyMiddleware(process.env.REDIS_URL!);
router.use(idempotencyMiddleware.middleware());

// Get all couriers
router.get('/', asyncHandler((req, res) => courierController.getCouriers(req, res)));

// Get specific courier
router.get('/:courierId', asyncHandler((req, res) => courierController.getCourier(req, res)));

// Update courier status
router.put('/:courierId/status', asyncHandler((req, res) => courierController.updateCourierStatus(req, res)));

export default router;
