import { Request, Response } from 'express';
import { PlaceOrderUseCase, PlaceOrderRequest } from '../../application/use-cases/place-order.use-case';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { SupabaseOrderRepository } from '../../infrastructure/database/supabase-order.repository';
import { OrderStatus } from '../../domain/entities/order.entity';

export class OrderController {
  private orderRepository: OrderRepository;

  constructor(
    private readonly placeOrderUseCase: PlaceOrderUseCase
  ) {
    this.orderRepository = new SupabaseOrderRepository();
  }

  async placeOrder(req: Request, res: Response): Promise<void> {
    try {
      const request: PlaceOrderRequest = req.body;
      const response = await this.placeOrderUseCase.execute(request);
      res.status(201).json({
        id: response.orderId,
        buyerId: request.buyerId,
        sellerId: request.sellerId,
        status: response.status,
        totalAmount: {
          amount: request.items.reduce((sum, item) => {
            const price = typeof item.price === 'number' ? item.price : item.price.amount;
            return sum + (price * item.quantity);
          }, 0),
          currency: request.currency || 'TZS'
        },
        items: request.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: typeof item.price === 'number' ? { amount: item.price, currency: request.currency || 'TZS' } : item.price,
          weight: item.weight
        })),
        deliveryAddress: request.deliveryAddress,
        paymentMethod: request.paymentMethod,
        createdAt: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(400).json({
        error: 'ORDER_CREATION_FAILED',
        message: error.message,
        requestId: req.headers['x-request-id'] as string
      });
    }
  }

  async getOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const order = await this.orderRepository.findById(id);

      if (!order) {
        res.status(404).json({
          error: 'ORDER_NOT_FOUND',
          message: `Order with ID ${id} not found`,
          requestId: req.headers['x-request-id'] as string
        });
        return;
      }

      res.status(200).json(order);
    } catch (error: any) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve order',
        requestId: req.headers['x-request-id'] as string
      });
    }
  }

  async getOrders(req: Request, res: Response): Promise<void> {
    try {
      const { buyerId, page = '1', limit = '10' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      if (!buyerId) {
        res.status(400).json({
          error: 'MISSING_BUYER_ID',
          message: 'buyerId query parameter is required',
          requestId: req.headers['x-request-id'] as string
        });
        return;
      }

      // For now, return all orders for the buyer (pagination not implemented yet)
      const orders = await this.orderRepository.findByBuyerId(buyerId as string);

      res.status(200).json({
        orders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: orders.length,
          totalPages: Math.ceil(orders.length / limitNum)
        }
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve orders',
        requestId: req.headers['x-request-id'] as string
      });
    }
  }

  async updateOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Find existing order
      const existingOrder = await this.orderRepository.findById(id);
      if (!existingOrder) {
        res.status(404).json({
          error: 'ORDER_NOT_FOUND',
          message: `Order with ID ${id} not found`,
          requestId: req.headers['x-request-id'] as string
        });
        return;
      }

      // Update order (simplified - only delivery address for now)
      if (updateData.deliveryAddress) {
        existingOrder.deliveryAddress = updateData.deliveryAddress;
        await this.orderRepository.update(existingOrder);
      }

      res.status(200).json(existingOrder);
    } catch (error: any) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to update order',
        requestId: req.headers['x-request-id'] as string
      });
    }
  }

  async deleteOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason = 'customer_request' } = req.query;

      // Find existing order
      const existingOrder = await this.orderRepository.findById(id);
      if (!existingOrder) {
        res.status(404).json({
          error: 'ORDER_NOT_FOUND',
          message: `Order with ID ${id} not found`,
          requestId: req.headers['x-request-id'] as string
        });
        return;
      }

      // Check if order can be cancelled (simplified check)
      if (existingOrder.status !== 'pending') {
        res.status(403).json({
          error: 'ORDER_CANNOT_BE_CANCELLED',
          message: 'Order cannot be cancelled at this stage',
          requestId: req.headers['x-request-id'] as string
        });
        return;
      }

      // Update status to cancelled
      existingOrder.status = 'cancelled' as OrderStatus;
      await this.orderRepository.update(existingOrder);

      res.status(200).json({
        id,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        reason
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to cancel order',
        requestId: req.headers['x-request-id'] as string
      });
    }
  }

  async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { action, notes, estimatedShippingDate, trackingNumber, carrier, estimatedDeliveryDate, deliveryConfirmation } = req.body;

      // Find existing order
      const existingOrder = await this.orderRepository.findById(id);
      if (!existingOrder) {
        res.status(404).json({
          error: 'ORDER_NOT_FOUND',
          message: `Order with ID ${id} not found`,
          requestId: req.headers['x-request-id'] as string
        });
        return;
      }

      const previousStatus = existingOrder.status;
      let newStatus: OrderStatus;
      let additionalData: any = {};

      // Validate state transitions
      switch (action) {
        case 'confirm':
          if (existingOrder.status !== 'pending') {
            res.status(403).json({
              error: 'INVALID_TRANSITION',
              message: 'Order must be pending to be confirmed',
              requestId: req.headers['x-request-id'] as string
            });
            return;
          }
          newStatus = 'confirmed' as OrderStatus;
          break;

        case 'process':
          if (existingOrder.status !== 'confirmed') {
            res.status(403).json({
              error: 'INVALID_TRANSITION',
              message: 'Order must be confirmed to be processed',
              requestId: req.headers['x-request-id'] as string
            });
            return;
          }
          newStatus = 'processing' as OrderStatus;
          additionalData.estimatedShippingDate = estimatedShippingDate;
          break;

        case 'ship':
          if (existingOrder.status !== 'processing') {
            res.status(403).json({
              error: 'INVALID_TRANSITION',
              message: 'Order must be processing to be shipped',
              requestId: req.headers['x-request-id'] as string
            });
            return;
          }
          newStatus = 'shipped' as OrderStatus;
          additionalData.trackingNumber = trackingNumber;
          additionalData.carrier = carrier;
          additionalData.estimatedDeliveryDate = estimatedDeliveryDate;
          break;

        case 'complete':
          if (existingOrder.status !== 'shipped') {
            res.status(403).json({
              error: 'INVALID_TRANSITION',
              message: 'Order must be shipped to be completed',
              requestId: req.headers['x-request-id'] as string
            });
            return;
          }
          newStatus = 'delivered' as OrderStatus;
          additionalData.deliveryConfirmation = deliveryConfirmation;
          break;

        default:
          res.status(400).json({
            error: 'INVALID_ACTION',
            message: 'Action must be one of: confirm, process, ship, complete',
            requestId: req.headers['x-request-id'] as string
          });
          return;
      }

      // Update order status
      existingOrder.status = newStatus;
      await this.orderRepository.update(existingOrder);

      res.status(200).json({
        id,
        status: newStatus,
        previousStatus,
        updatedAt: new Date().toISOString(),
        notes,
        ...additionalData
      });

    } catch (error: any) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to update order status',
        requestId: req.headers['x-request-id'] as string
      });
    }
  }

  async searchOrders(req: Request, res: Response): Promise<void> {
    try {
      const { status, buyerId, limit = '10' } = req.query;
      const limitNum = parseInt(limit as string, 10);

      let orders: any[] = [];

      if (status) {
        // Search by status
        const statusList = (status as string).split(',');
        for (const statusValue of statusList) {
          const statusOrders = await this.orderRepository.findByStatus(statusValue as OrderStatus);
          orders = orders.concat(statusOrders);
        }
        // Remove duplicates
        orders = orders.filter((order, index, self) =>
          index === self.findIndex(o => o.id === order.id)
        );
      } else if (buyerId) {
        // Search by buyer
        orders = await this.orderRepository.findByBuyerId(buyerId as string);
      }

      // Apply limit
      orders = orders.slice(0, limitNum);

      res.status(200).json({
        orders,
        total: orders.length
      });

    } catch (error: any) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to search orders',
        requestId: req.headers['x-request-id'] as string
      });
    }
  }

  async getOrderAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { period = 'daily', startDate, endDate } = req.query;

      // Get basic stats (simplified implementation)
      const totalOrders = await this.orderRepository.count();
      const confirmedOrders = await this.orderRepository.findByStatus('confirmed' as OrderStatus);
      const deliveredOrders = await this.orderRepository.findByStatus('delivered' as OrderStatus);

      // Calculate total revenue (simplified)
      let totalRevenue = 0;
      const allOrders = await this.orderRepository.findByBuyerId(''); // This won't work, simplified
      // In real implementation, you'd query with aggregation

      const analytics = {
        totalOrders,
        confirmedOrders: confirmedOrders.length,
        deliveredOrders: deliveredOrders.length,
        totalRevenue,
        period,
        dateRange: {
          startDate,
          endDate
        }
      };

      res.status(200).json(analytics);

    } catch (error: any) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to get analytics',
        requestId: req.headers['x-request-id'] as string
      });
    }
  }
}
