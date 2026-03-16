import { ICapabilityAdapter } from '../../domain/ports';
import { logger } from '../services/logger.service';

/**
 * Capability Adapter - In-process stub (capability service removed)
 */
export class CapabilityAdapter implements ICapabilityAdapter {
  async enableCapabilities(params: {
    businessId: string;
    ownerId: string;
    capabilities: string[];
    correlationId: string;
  }): Promise<string[]> {
    try {
      const ids = params.capabilities.map((c, i) => `cap_${params.businessId}_${c}_${i}`);
      logger.debug('Capabilities enabled', { businessId: params.businessId, count: ids.length });
      return ids;
    } catch (error) {
      logger.warn('CapabilityAdapter: enableCapabilities failed', {
        businessId: params.businessId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async disableCapabilities(params: {
    businessId: string;
    capabilityIds: string[];
    correlationId: string;
  }): Promise<void> {
    try {
      logger.debug('Capabilities disabled', { businessId: params.businessId, count: params.capabilityIds.length });
    } catch (error) {
      logger.warn('CapabilityAdapter: disableCapabilities failed', {
        businessId: params.businessId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}
