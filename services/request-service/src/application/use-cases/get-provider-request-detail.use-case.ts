/**
 * GetProviderRequestDetailUseCase (Phase 1 §1.3)
 *
 * Provider/ops view of a request including its assessments (internalNotes)
 * and quotes. Only for the assigned provider or admins/ops — never a
 * customer-facing payload.
 */

import { RequestEntity } from '../../domain/entities/request.entity';
import { RequestRepository } from '../../domain/repositories/request.repository';
import { RequestAssessmentRepository } from '../../domain/repositories/request-assessment.repository';
import { ForbiddenError, NotFoundError } from '../../../../../shared/errors/api-errors';

export interface ProviderRequestDetail {
  request: ReturnType<RequestEntity['toJSON']>;
  assessments: Array<ReturnType<import('../../domain/entities/request-assessment.entity').RequestAssessment['toJSON']>>;
}

export class GetProviderRequestDetailUseCase {
  constructor(
    private readonly requestRepo: RequestRepository,
    private readonly assessmentRepo: RequestAssessmentRepository,
  ) {}

  async execute(providerId: string, requestId: string): Promise<ProviderRequestDetail> {
    const request = await this.requestRepo.findById(requestId);
    if (!request) throw new NotFoundError(`Request ${requestId} not found`);
    if (request.assignedProviderId !== providerId) {
      throw new ForbiddenError('Only the assigned provider can view this request');
    }

    const assessments = await this.assessmentRepo.listByRequest(requestId);
    return {
      request: request.toJSON(),
      assessments: assessments.map((a) => a.toJSON()),
    };
  }
}