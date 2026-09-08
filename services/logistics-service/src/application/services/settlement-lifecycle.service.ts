/**
 * SettlementLifecycleService (Phase 3 runtime wiring)
 *
 * The single entry point the delivery-event consumer calls:
 *
 *   recordAdjustment(event)      → RecordCostAdjustmentUseCase (immutable
 *                                  adjustment + ledger ADJUSTMENT mirror)
 *   writeJobCompletionLedger(...) → RecordJobCompletionLedgerUseCase (the
 *                                   four §3.3 completion entries)
 *   settle(deliveryJobId)        → SettleDeliveryJobUseCase (ledger-only)
 *
 * Registered on globalThis as __settlementService so the DeliveryCompleted /
 * DeliveryFailed consumer and ops tooling can call one object (non-fatal).
 */

import { RecordCostAdjustmentUseCase, RecordCostAdjustmentRequest } from '../use-cases/record-cost-adjustment.use-case';
import { RecordJobCompletionLedgerUseCase, JobCompletionLedgerRequest } from '../use-cases/record-job-completion-ledger.use-case';
import { SettleDeliveryJobUseCase, SettlementResult } from '../use-cases/settle-delivery-job.use-case';
import { CostAdjustmentRepository, LedgerEntryRepository } from '../../domain/repositories/cost-model.repository';
import { PrismaCostAdjustmentRepository, PrismaLedgerEntryRepository } from '../../infrastructure/repositories/prisma-cost-model.repository';
import { CostVariancePolicy } from '../../domain/value-objects/optimization-config.value-object';

const NEUTRAL_POLICY: CostVariancePolicy = {
  maysarAbsorbsUpToTzs: 0,
  customerChargeableVarianceTypes: [],
};

export class SettlementLifecycleService {
  private readonly adjustmentRepo: CostAdjustmentRepository;
  private readonly ledgerRepo: LedgerEntryRepository;
  private readonly recordAdjustmentUseCase: RecordCostAdjustmentUseCase;
  private readonly completionLedgerUseCase: RecordJobCompletionLedgerUseCase;
  private readonly settleUseCase: SettleDeliveryJobUseCase;

  constructor(
    adjustmentRepo?: CostAdjustmentRepository,
    ledgerRepo?: LedgerEntryRepository,
  ) {
    this.adjustmentRepo = adjustmentRepo ?? new PrismaCostAdjustmentRepository();
    this.ledgerRepo = ledgerRepo ?? new PrismaLedgerEntryRepository();
    this.recordAdjustmentUseCase = new RecordCostAdjustmentUseCase(this.adjustmentRepo, this.ledgerRepo);
    this.completionLedgerUseCase = new RecordJobCompletionLedgerUseCase(this.ledgerRepo);
    this.settleUseCase = new SettleDeliveryJobUseCase(this.ledgerRepo);
  }

  async recordAdjustment(request: RecordCostAdjustmentRequest): Promise<unknown> {
    return this.recordAdjustmentUseCase.execute(request);
  }

  async writeJobCompletionLedger(request: JobCompletionLedgerRequest): Promise<unknown> {
    return this.completionLedgerUseCase.execute(request);
  }

  async settle(
    deliveryJobId: string,
    variancePolicy?: CostVariancePolicy,
  ): Promise<SettlementResult> {
    return this.settleUseCase.execute({
      deliveryJobId,
      variancePolicy: variancePolicy ?? NEUTRAL_POLICY,
    });
  }
}