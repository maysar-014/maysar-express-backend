/**
 * Capability Port - Domain interface for capability service integration
 * Implemented by infrastructure adapters (capability-service HTTP, etc.)
 */
export interface ICapabilityAdapter {
  enableCapabilities(params: {
    businessId: string;
    ownerId: string;
    capabilities: string[];
    correlationId: string;
  }): Promise<string[]>;

  disableCapabilities(params: {
    businessId: string;
    capabilityIds: string[];
    correlationId: string;
  }): Promise<void>;
}
