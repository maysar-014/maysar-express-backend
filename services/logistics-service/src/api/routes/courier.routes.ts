import { Router } from 'express';
import { CourierController } from '../controllers/courier.controller';
import { IdempotencyMiddleware } from '@shared/middleware/idempotency';

const router = Router();
const courierController = new CourierController();
const idempotencyMiddleware = new IdempotencyMiddleware(process.env.REDIS_URL!);
router.use(idempotencyMiddleware.middleware());

// Get all couriers
router.get('/', (req, res) => courierController.getCouriers(req, res));

// Get specific courier
router.get('/:courierId', (req, res) => courierController.getCourier(req, res));

// Update courier status
router.put('/:courierId/status', (req, res) => courierController.updateCourierStatus(req, res));

export default router;
