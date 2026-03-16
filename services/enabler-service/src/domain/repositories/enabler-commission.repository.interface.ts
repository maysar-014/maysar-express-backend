import { EnablerCommissionEntity } from '../entities/enabler-commission.entity';

export interface IEnablerCommissionRepository {
  upsert(commission: EnablerCommissionEntity): Promise<void>;
}
