/**
 * AssessRequestUseCase (Phase 1 §1.3)
 *
 * The assigned provider submits a decision. Atomically:
 *  - FULFILLABLE        → request status FULFILLABLE
 *  - NEEDS_CLARIFICATION→ request status NEEDS_CLARIFICATION + STATUS message
 *  - UNFULFILLABLE      → request status UNFULFILLABLE + reason (entity-enforced)
 *
 * The assessment row records who decided and when. internalNotes never leave
 * the service (response mappers strip them — see customer payload tests).
 */

import { RequestEntity } from '../../domain/entities/request.entity';
import { RequestAssessment, AssessmentDecision } from '../../domain/entities/request-assessment.entity';
import { RequestMessage } from '../../domain/entities/request-message.entity';
import { RequestRepository } from '../../domain/repositories/request.repository';
import { RequestAssessmentRepository } from '../../domain/repositories/request-assessment.repository';
import { RequestMessageRepository } from '../../domain/repositories/request-message.repository';
import { ForbiddenError, NotFoundError } from '../../../../../shared/errors/api-errors';
import { publishRequestEvent } from '../../infrastructure/messaging/request-outbox';
import { recordRequestAudit } from '../services/request-audit';

export interface AssessRequestInput {
  decision: AssessmentDecision;
  unfulfillableReason?: string | null;
  internalNotes?: string | null;
}

export interface AssessRequestResult {
  request: ReturnType<RequestEntity['toJSON']>;
  assessment: ReturnType<RequestAssessment['toJSON']>;
}

export class AssessRequestUseCase {
  constructor(
    private readonly requestRepo: RequestRepository,
    private readonly assessmentRepo: RequestAssessmentRepository,
    private readonly messageRepo: RequestMessageRepository,
  ) {}

  async execute(providerId: string, requestId: string, input: AssessRequestInput): Promise<AssessRequestResult> {
    const request = await this.requestRepo.findById(requestId);
    if (!request) throw new NotFoundError(`Request ${requestId} not found`);

    // Provider-assignment check (§1.3). Unassigned requests are not assessable.
    if (request.assignedProviderId !== providerId) {
      throw new ForbiddenError('Only the assigned provider can assess this request');
    }

    const assessment = RequestAssessment.create({
      requestId: request.id,
      providerId,
      decision: input.decision,
      unfulfillableReason: input.unfulfillableReason,
      internalNotes: input.internalNotes,
    });
    await this.assessmentRepo.save(assessment);
    await recordRequestAudit({
      requestId: request.id,
      actorType: 'PROVIDER',
      actorId: providerId,
      action: 'ASSESSED',
      detail: { assessmentId: assessment.id },
    });

    // Normalise to ASSESSING first: the backlog state machine requires
    // SUBMITTED → ASSESSING → decision. A provider picking the request up
    // (or re-assessing after clarification) enters ASSESSING.
    if (request.status === 'SUBMITTED' || request.status === 'NEEDS_CLARIFICATION') {
      request.markAssessing();
    }

    switch (input.decision) {
      case 'FULFILLABLE':
        request.markFulfillable();
        await this.requestRepo.save(request);
        await publishRequestEvent('request.fulfillable', { requestId: request.id, providerId });
        break;
      case 'NEEDS_CLARIFICATION':
        request.markNeedsClarification();
        await this.requestRepo.save(request);
        try {
          const message = RequestMessage.create({
            requestId: request.id,
            authorType: 'STATUS',
            body: 'Maysar needs a little more information before we can assess this request.',
          });
          await this.messageRepo.addMessage(message);
        } catch (err: any) {
          console.error('[AssessRequestUseCase] Failed to post status message:', err?.message);
        }
        await publishRequestEvent('request.needs_clarification', { requestId: request.id, providerId });
        break;
      case 'UNFULFILLABLE':
        request.markUnfulfillable(input.unfulfillableReason ?? '');
        await this.requestRepo.save(request);
        try {
          const message = RequestMessage.create({
            requestId: request.id,
            authorType: 'STATUS',
            body: 'Unfortunately we are unable to fulfil this request.',
          });
          await this.messageRepo.addMessage(message);
        } catch (err: any) {
          console.error('[AssessRequestUseCase] Failed to post status message:', err?.message);
        }
        await publishRequestEvent('request.unfulfillable', { requestId: request.id, providerId, reason: request.unfulfillableReason });
        break;
    }

    return { request: request.toJSON(), assessment: assessment.toJSON() };
  }
}