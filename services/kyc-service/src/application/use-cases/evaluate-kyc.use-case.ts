import { KycEvaluationService } from '../../domain/services/kyc-evaluation.service';
import { PrismaKycRepository } from '../../infrastructure/repositories/prisma-kyc.repository';
import { AggregatedKycUserData, KycTrigger } from '../../domain/types/kyc.types';

export class EvaluateKycUseCase {
  constructor(
    private readonly repository: PrismaKycRepository,
    private readonly evaluationService: KycEvaluationService
  ) {}

  async execute(userId: string): Promise<{ trigger: KycTrigger | null; aggregatedData: AggregatedKycUserData }> {
    const aggregatedData = await this.repository.getAggregatedUserData(userId);
    const trigger = this.evaluationService.evaluateKycRequirement(aggregatedData);
    return { trigger, aggregatedData };
  }
}

