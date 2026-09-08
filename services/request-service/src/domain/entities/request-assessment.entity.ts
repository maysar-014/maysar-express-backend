/**
 * RequestAssessment Entity (Phase 1 §1.3)
 *
 * A provider decision on a Request. `internalNotes` are internal-only and must
 * never be included in customer-facing payloads.
 */

import { makeId } from '../../../../../shared/ids/id';

export type AssessmentDecision = 'FULFILLABLE' | 'NEEDS_CLARIFICATION' | 'UNFULFILLABLE';

export interface RequestAssessmentData {
  id: string;
  requestId: string;
  providerId: string;
  decision: AssessmentDecision;
  unfulfillableReason: string | null;
  internalNotes: string | null;
  assessedAt: Date;
}

export function makeRequestAssessmentId(): string {
  return makeId('RAS');
}

export class RequestAssessment {
  private data: RequestAssessmentData;

  constructor(data: RequestAssessmentData) {
    if (!data.requestId) throw new Error('RequestAssessment invariant violation: requestId is required');
    if (!data.providerId) throw new Error('RequestAssessment invariant violation: providerId is required');
    if (!['FULFILLABLE', 'NEEDS_CLARIFICATION', 'UNFULFILLABLE'].includes(data.decision)) {
      throw new Error(`RequestAssessment invariant violation: unknown decision ${data.decision}`);
    }
    if (data.decision === 'UNFULFILLABLE' && !data.unfulfillableReason) {
      throw new Error('RequestAssessment invariant violation: UNFULFILLABLE requires unfulfillableReason');
    }
    this.data = { ...data };
  }

  static create(params: {
    requestId: string;
    providerId: string;
    decision: AssessmentDecision;
    unfulfillableReason?: string | null;
    internalNotes?: string | null;
  }): RequestAssessment {
    return new RequestAssessment({
      id: makeRequestAssessmentId(),
      requestId: params.requestId,
      providerId: params.providerId,
      decision: params.decision,
      unfulfillableReason: params.unfulfillableReason ?? null,
      internalNotes: params.internalNotes ?? null,
      assessedAt: new Date(),
    });
  }

  get id() { return this.data.id; }
  get requestId() { return this.data.requestId; }
  get providerId() { return this.data.providerId; }
  get decision() { return this.data.decision; }
  get unfulfillableReason() { return this.data.unfulfillableReason; }
  get internalNotes() { return this.data.internalNotes; }
  get assessedAt() { return this.data.assessedAt; }

  toJSON(): RequestAssessmentData {
    return { ...this.data };
  }
}