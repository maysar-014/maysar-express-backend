import { IComplianceAdapter } from '../../domain/ports';
import { logger } from '../services/logger.service';

const COMPLIANCE_SERVICE_URL = process.env.COMPLIANCE_SERVICE_URL || 'http://localhost:3013';

/**
 * Compliance Adapter - Calls compliance service HTTP API
 */
export class ComplianceAdapter implements IComplianceAdapter {
  constructor(private readonly baseUrl: string = COMPLIANCE_SERVICE_URL) {}

  async notifyNewBusiness(params: {
    businessId: string;
    ownerId: string;
    businessType: string;
    registrationNumber: string;
    correlationId: string;
  }): Promise<void> {
    const url = `${this.baseUrl}/api/compliance/monitor`;
    const body = {
      complianceType: 'local_regulatory',
      entityId: params.businessId,
      operation: 'business_registered',
      sagaId: params.correlationId,
      metadata: {
        ownerId: params.ownerId,
        businessType: params.businessType,
        registrationNumber: params.registrationNumber
      }
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Compliance service error ${res.status}: ${errText}`);
      }

      logger.debug('Compliance notified for new business', { businessId: params.businessId });
    } catch (error) {
      logger.warn('ComplianceAdapter: notifyNewBusiness failed', {
        businessId: params.businessId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async createComplianceRecord(params: {
    businessId: string;
    complianceType: string;
    status: string;
    correlationId: string;
  }): Promise<string> {
    const url = `${this.baseUrl}/api/compliance/monitor`;
    const body = {
      complianceType: params.complianceType,
      entityId: params.businessId,
      operation: 'create_record',
      sagaId: params.correlationId,
      metadata: { status: params.status }
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Compliance service error ${res.status}: ${errText}`);
      }

      const data = (await res.json()) as { recordId?: string };
      const recordId = data.recordId ?? `compliance_${params.businessId}_${Date.now()}`;
      logger.debug('Compliance record created', { businessId: params.businessId, recordId });
      return recordId;
    } catch (error) {
      logger.warn('ComplianceAdapter: createComplianceRecord failed', {
        businessId: params.businessId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async revokeComplianceRecord(recordId: string, correlationId: string): Promise<void> {
    const url = `${this.baseUrl}/api/compliance/monitor`;
    const body = {
      complianceType: 'local_regulatory',
      entityId: recordId,
      operation: 'revoke_record',
      sagaId: correlationId
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Compliance service error ${res.status}: ${errText}`);
      }

      logger.debug('Compliance record revoked', { recordId });
    } catch (error) {
      logger.warn('ComplianceAdapter: revokeComplianceRecord failed', {
        recordId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}
