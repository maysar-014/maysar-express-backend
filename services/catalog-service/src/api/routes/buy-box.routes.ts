import { Router } from 'express';
import { BuyBoxController } from '../controllers/buy-box.controller';

export class BuyBoxRoutes {
  private router: Router;

  constructor(private readonly controller: BuyBoxController) {
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.get('/products/:productId/buy-box', (req, res) => this.controller.getBuyBox(req, res));
    this.router.post('/products/:productId/buy-box/compute', (req, res) => this.controller.triggerCompute(req, res));
  }

  getRouter(): Router {
    return this.router;
  }
}
