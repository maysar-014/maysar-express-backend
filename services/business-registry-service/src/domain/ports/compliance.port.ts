/**
 * Compliance Port - Domain interface for KYC compliance service integration
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

  createKYCRecord(params: {
    businessId: string;
    status: string;
    correlationId: string;
  }): Promise<string>;

  revokeKYCRecord(recordId: string, correlationId: string): Promise<void>;
}
