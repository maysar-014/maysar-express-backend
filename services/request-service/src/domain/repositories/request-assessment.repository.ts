/**
 * RequestAssessmentRepository (Phase 1 §1.3)
 */

import { RequestAssessment } from '../entities/request-assessment.entity';

export interface RequestAssessmentRepository {
  save(assessment: RequestAssessment): Promise<void>;
  findById(id: string): Promise<RequestAssessment | null>;
  listByRequest(requestId: string): Promise<RequestAssessment[]>;
}