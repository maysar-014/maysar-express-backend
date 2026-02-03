import { ICapabilityAdapter } from '../../domain/ports';
import { logger } from '../services/logger.service';

const CAPABILITY_SERVICE_URL = process.env.CAPABILITY_SERVICE_URL || 'http://localhost:3020';

/**
 * Capability Adapter - Calls capability service HTTP API
 * When service is unavailable, logs and returns stub capability IDs for compensation tracking
 */
export class CapabilityAdapter implements ICapabilityAdapter {
  constructor(private readonly baseUrl: string = CAPABILITY_SERVICE_URL) {}

  async enableCapabilities(params: {
    businessId: string;
    ownerId: string;
    capabilities: string[];
    correlationId: string;
  }): Promise<string[]> {
    const url = `${this.baseUrl}/api/capabilities/enable`;
    const body = {
      businessId: params.businessId,
      ownerId: params.ownerId,
      capabilities: params.capabilities,
      correlationId: params.correlationId
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Capability service error ${res.status}: ${errText}`);
      }

      const data = (await res.json()) as { capabilityIds?: string[] };
      const ids = data.capabilityIds ?? params.capabilities.map((c, i) => `cap_${params.businessId}_${c}_${i}`);
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
    const url = `${this.baseUrl}/api/capabilities/disable`;
    const body = {
      businessId: params.businessId,
      capabilityIds: params.capabilityIds,
      correlationId: params.correlationId
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Capability service error ${res.status}: ${errText}`);
      }

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
