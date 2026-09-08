import { RequestProcurement, ProcurementStatus } from '../entities/request-procurement.entity';

export interface RequestProcurementRepository {
  save(procurement: RequestProcurement): Promise<void>;
  findById(id: string): Promise<RequestProcurement | null>;
  findByOrderId(orderId: string): Promise<RequestProcurement[]>;
  updateStatus(
    id: string,
    status: ProcurementStatus,
    extra?: { orderedAt?: Date | null; receivedAt?: Date | null; notes?: string | null },
  ): Promise<void>;
}