import { PricingConfig } from '../value-objects/pricing-config.value-object';

export interface PricingConfigRepository {
  getActive(): Promise<PricingConfig>;
  getByVersion(version: number): Promise<PricingConfig | null>;
  save(config: PricingConfig): Promise<void>;
  getNextVersion(): Promise<number>;
}
