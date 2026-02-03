/**
 * Compliance Port - Domain interface for compliance service integration
 * Implemented by infrastructure adapters (compliance-service HTTP, etc.)
 */
export interface IComplianceAdapter {
  notifyNewBusiness(params: {
    businessId: string;
    ownerId: string;
    businessType: string;
    registrationNumber: string;
    correlationId: string;
  }): Promise<void>;

  createComplianceRecord(params: {
    businessId: string;
    complianceType: string;
    status: string;
    correlationId: string;
  }): Promise<string>;

  revokeComplianceRecord(recordId: string, correlationId: string): Promise<void>;
}
