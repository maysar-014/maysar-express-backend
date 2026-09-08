/**
 * ListProcurementUseCase (Phase 2 §2.3)
 * Provider/ops reads the exact Order → Item → Supplier map for an order.
 * Maysar-internal — never exposed to the customer.
 */

import { RequestProcurement } from '../../domain/entities/request-procurement.entity';
import { RequestProcurementRepository } from '../../domain/repositories/request-procurement.repository';

export class ListProcurementUseCase {
  constructor(private readonly procurementRepo: RequestProcurementRepository) {}

  async execute(orderId: string): Promise<RequestProcurement[]> {
    return this.procurementRepo.findByOrderId(orderId);
  }
}