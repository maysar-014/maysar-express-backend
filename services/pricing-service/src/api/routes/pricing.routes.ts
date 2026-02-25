import { Router } from 'express';
import { PricingController } from '../controllers/pricing.controller';

const router = Router();
const pricingController = new PricingController();

router.post('/calculate', (req, res) => pricingController.calculatePrice(req, res));

export default router;
