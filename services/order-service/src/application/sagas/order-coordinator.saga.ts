import { Order } from '../../domain/entities/order.entity';
import { CODPolicy } from '../../domain/policies/cod.policy';
import { CancellationPolicy } from '../../domain/policies/cancellation.policy';

export class OrderCoordinator {
  constructor(
    private codPolicy: CODPolicy,
    private cancellationPolicy: CancellationPolicy
  ) {}

  async validateOrder(orderData: any): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];

    // Apply COD policy
    const codValidation = await this.codPolicy.validate(orderData);
    if (!codValidation.valid) {
      errors.push(...codValidation.errors);
    }

    // Check weight limits and heavy-item penalties
    if (orderData.totalWeight > 50) {
      errors.push('Order exceeds maximum weight limit');
    }

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  async processOrder(orderData: any): Promise<Order> {
    const validation = await this.validateOrder(orderData);
    if (!validation.valid) {
      throw new Error(`Order validation failed: ${validation.errors?.join(', ')}`);
    }

    const order = new Order(orderData);

    // Order service focuses on order creation and validation
    // Payment processing is handled by payment saga if needed
    // Delivery coordination is handled by logistics service

    return order;
  }
}
