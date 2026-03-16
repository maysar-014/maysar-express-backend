import { IComplianceAdapter } from '../../domain/ports';
import { logger } from '../services/logger.service';
import { eventBus } from '@shared/events/eventBus';

/**
 * Compliance Adapter - In-process compliance signaling
 */
export class ComplianceAdapter implements IComplianceAdapter {
  async notifyNewBusiness(params: {
    businessId: string;
    ownerId: string;
    businessType: string;
    registrationNumber: string;
    correlationId: string;
  }): Promise<void> {
    const body = {
      complianceType: 'kyc',
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
      await eventBus.publish('ComplianceCheckCompleted.v1', {
        complianceType: body.complianceType,
        entityId: body.entityId,
        complianceResult: { status: 'compliant', score: 95.5 },
        sagaId: body.sagaId
      });

      await eventBus.publish('ComplianceRecorded.v1', {
        complianceType: body.complianceType,
        entityId: body.entityId,
        operation: body.operation,
        sagaId: body.sagaId
      });

      logger.debug('KYC compliance notified for new business', { businessId: params.businessId });
    } catch (error) {
      logger.warn('ComplianceAdapter: notifyNewBusiness failed', {
        businessId: params.businessId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async createKYCRecord(params: {
    businessId: string;
    status: string;
    correlationId: string;
  }): Promise<string> {
    const body = {
      complianceType: 'kyc',
      entityId: params.businessId,
      operation: 'create_record',
      sagaId: params.correlationId,
      metadata: { status: params.status }
    };

    try {
      await eventBus.publish('ComplianceCheckCompleted.v1', {
        complianceType: body.complianceType,
        entityId: body.entityId,
        complianceResult: { status: params.status, score: 95.5 },
        sagaId: body.sagaId
      });

      await eventBus.publish('ComplianceRecorded.v1', {
        complianceType: body.complianceType,
        entityId: body.entityId,
        operation: body.operation,
        sagaId: body.sagaId
      });

      const recordId = `kyc_${params.businessId}_${Date.now()}`;
      logger.debug('KYC record created', { businessId: params.businessId, recordId });
      return recordId;
    } catch (error) {
      logger.warn('ComplianceAdapter: createKYCRecord failed', {
        businessId: params.businessId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async revokeKYCRecord(recordId: string, correlationId: string): Promise<void> {
    const body = {
      complianceType: 'kyc',
      entityId: recordId,
      operation: 'revoke_record',
      sagaId: correlationId
    };

    try {
      await eventBus.publish('ComplianceCheckCompleted.v1', {
        complianceType: body.complianceType,
        entityId: body.entityId,
        complianceResult: { status: 'revoked', score: 0 },
        sagaId: body.sagaId
      });

      await eventBus.publish('ComplianceRecorded.v1', {
        complianceType: body.complianceType,
        entityId: body.entityId,
        operation: body.operation,
        sagaId: body.sagaId
      });

      logger.debug('KYC record revoked', { recordId });
    } catch (error) {
      logger.warn('ComplianceAdapter: revokeKYCRecord failed', {
        recordId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}
