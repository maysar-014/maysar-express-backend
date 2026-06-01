import { RiskFactor } from '../engines/cod-trust/per-order-risk.assessor';

export interface RiskAssessmentRecord {
  id: string;
  buyerId: string;
  orderId: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  activeFactors: RiskFactor[];
  requiresCommitmentFee: boolean;
  requiresManualReview: boolean;
  createdAt: Date;
}

export interface ICODRiskAssessmentRepository {
  save(assessment: RiskAssessmentRecord): Promise<void>;
  findByOrderId(orderId: string): Promise<RiskAssessmentRecord | null>;
}
