import { Order } from '../aggregates/order.aggregate';
import { CODPolicy } from '../policies/cod.policy';
import { CancellationPolicy } from '../policies/cancellation.policy';

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
    
    // Trigger delivery saga
    await this.triggerDeliverySaga(order);
    
    // Trigger payment saga if needed
    if (orderData.paymentMethod !== 'COD') {
      await this.triggerPaymentSaga(order);
    }

    return order;
  }

  private async triggerDeliverySaga(order: Order): Promise<void> {
    // Implementation will integrate with saga orchestrator
  }

  private async triggerPaymentSaga(order: Order): Promise<void> {
    // Implementation will integrate with saga orchestrator
  }
}