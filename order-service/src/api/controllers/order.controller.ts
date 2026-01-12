import { Request, Response } from 'express';
import { PlaceOrderUseCase, PlaceOrderRequest } from '../../application/use-cases/place-order.use-case';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { EventPublisher } from '../../application/use-cases/place-order.use-case';

export class OrderController {
  constructor(
    private readonly placeOrderUseCase: PlaceOrderUseCase
  ) {}

  async placeOrder(req: Request, res: Response): Promise<void> {
    try {
      const request: PlaceOrderRequest = req.body;
      const response = await this.placeOrderUseCase.execute(request);
      res.status(201).json(response);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getOrder(req: Request, res: Response): Promise<void> {
    // Implementation for getting order
    res.status(200).json({ message: 'Get order not implemented yet' });
  }
}
