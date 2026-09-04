import { DeliveryGroup } from '../entities/delivery-group.entity';

export interface DeliveryGroupRepository {
  save(group: DeliveryGroup): Promise<void>;
  findById(id: string): Promise<DeliveryGroup | null>;
  findByMasterOrderId(masterOrderId: string): Promise<DeliveryGroup[]>;
  updateStatus(id: string, status: string, quoteId?: string): Promise<void>;
}
