/**
 * Phase 3 runtime-wiring integration tests:
 *   §3.2 attribution rules → immutable CostAdjustment + ledger ADJUSTMENT mirror
 *   §3.3 completion ledger (buyer/carrier/maysar/saving entries)
 *   §3.4 savings → Maysar (post-confirmation optimization benefit)
 *   Settlement reads the ledger only (never adjustments directly)
 */

import { RecordCostAdjustmentUseCase } from '../record-cost-adjustment.use-case';
import { RecordJobCompletionLedgerUseCase } from '../record-job-completion-ledger.use-case';
import { SettleDeliveryJobUseCase } from '../settle-delivery-job.use-case';
import { CostAdjustment } from '../../../domain/entities/cost-adjustment.entity';
import { LedgerEntry } from '../../../domain/entities/ledger-entry.entity';
import { AttributionEvent, resolveAttribution } from '../../../domain/engines/cost-attribution';

const ADJUSTMENTS = new Map<string, CostAdjustment>();
const LEDGER: LedgerEntry[] = [];

const adjustmentRepo = {
  async save(a: CostAdjustment): Promise<void> { ADJUSTMENTS.set(a.id, a); },
  async findByDeliveryJobId(deliveryJobId: string): Promise<CostAdjustment[]> {
    return [...ADJUSTMENTS.values()].filter(a => a.deliveryJobId === deliveryJobId);
  },
  async findByDeliveryJobIdAndParty(deliveryJobId: string, party: any): Promise<CostAdjustment[]> {
    return [...ADJUSTMENTS.values()].filter(a => a.deliveryJobId === deliveryJobId && a.responsibleParty === party);
  },
};

const ledgerRepo = {
  async append(e: LedgerEntry): Promise<void> { LEDGER.push(e); },
  async findByDeliveryJobId(deliveryJobId: string): Promise<LedgerEntry[]> {
    return LEDGER.filter(e => e.deliveryJobId === deliveryJobId);
  },
  async findByDeliveryJobIdAndType(deliveryJobId: string, type: any): Promise<LedgerEntry[]> {
    return LEDGER.filter(e => e.deliveryJobId === deliveryJobId && e.entryType === type);
  },
};

describe('Phase 3 runtime wiring', () => {
  beforeEach(() => { ADJUSTMENTS.clear(); LEDGER.length = 0; });

  it('§3.2 attributes operational events to the correct party and type', async () => {
    const useCase = new RecordCostAdjustmentUseCase(adjustmentRepo, ledgerRepo);
    const cases: Array<{ event: AttributionEvent; type: string; party: string }> = [
      { event: 'SUPPLIER_NOT_READY',  type: 'WAITING', party: 'SUPPLIER' },
      { event: 'CUSTOMER_UNREACHABLE', type: 'FAILED_DELIVERY_ATTEMPT', party: 'CUSTOMER' },
      { event: 'ROUTE_MISCALCULATED',  type: 'ROUTE_DEVIATION', party: 'MAYSAR' },
      { event: 'DRIVER_DEVIATION',     type: 'ROUTE_DEVIATION', party: 'DRIVER' },
      { event: 'EXTERNAL_DELAY',       type: 'WAITING', party: 'EXTERNAL' },
    ];
    for (const c of cases) {
      const r = await useCase.execute({
        deliveryJobId: 'djb-1',
        event: c.event,
        amountTzs: 1000,
        reason: `test: ${c.event}`,
        recordedBy: 'ops',
        pricingVersion: 2,
      });
      expect(r.adjustmentType).toBe(c.type);
      expect(r.responsibleParty).toBe(c.party);
    }
    const adjustments = await adjustmentRepo.findByDeliveryJobId('djb-1');
    expect(adjustments).toHaveLength(5);
    // Every adjustment is mirrored as a ledger ADJUSTMENT entry (settlement reads ledger only).
    const adjustmentEntries = LEDGER.filter(e => e.entryType === 'ADJUSTMENT');
    expect(adjustmentEntries).toHaveLength(5);
  });

  it('§3.3 writes buyer/carrier/maysar entries on completion', async () => {
    const useCase = new RecordJobCompletionLedgerUseCase(ledgerRepo);
    const r = await useCase.execute({
      deliveryJobId: 'djb-1',
      buyerPriceTzs: 6000,
      actualFulfillmentCostTzs: 4500,
      driverCompensationTzs: 2500,
      buyerId: 'buy-1',
      driverId: 'drv-1',
      pricingVersion: 2,
      tariffVersion: 3,
      routingVersion: 'route-v1',
    });
    expect(r.maysarRevenueTzs).toBe(1500);
    expect(r.consolidationSavingEntryId).toBeNull();
    const entries = await ledgerRepo.findByDeliveryJobId('djb-1');
    expect(entries.map(e => e.entryType).sort()).toEqual([
      'BUYER_LOGISTICS_CHARGE', 'CARRIER_PAYABLE', 'MAYSAR_LOGISTICS_REVENUE',
    ]);
    const buyer = entries.find(e => e.entryType === 'BUYER_LOGISTICS_CHARGE')!;
    const carrier = entries.find(e => e.entryType === 'CARRIER_PAYABLE')!;
    expect(buyer.amountTzs).toBe(6000);
    expect(carrier.amountTzs).toBe(-2500);
    expect(buyer.pricingVersion).toBe(2);
    expect(buyer.tariffVersion).toBe(3);
    expect(buyer.routingVersion).toBe('route-v1');
  });

  it('§3.4 records post-confirmation optimization savings to Maysar, never the buyer', async () => {
    const useCase = new RecordJobCompletionLedgerUseCase(ledgerRepo);
    const r = await useCase.execute({
      deliveryJobId: 'djb-1',
      buyerPriceTzs: 6000,             // locked price unchanged
      actualFulfillmentCostTzs: 3800,  // optimizer found cheaper route
      plannedFulfillmentCostTzs: 4500, // what the price was planned against
      driverCompensationTzs: 2500,
      buyerId: 'buy-1',
      driverId: 'drv-1',
      pricingVersion: 2,
    });
    expect(r.consolidationSavingEntryId).not.toBeNull();
    expect(r.consolidationSavingTzs).toBe(700);
    expect(r.maysarRevenueTzs).toBe(2200); // 6000 − 3800, saving NOT passed to buyer
    const saving = LEDGER.find(e => e.entryType === 'CONSOLIDATION_SAVING')!;
    expect(saving.amountTzs).toBe(700);
    expect(saving.counterpartyId).toBe('MAYSAR');
  });

  it('settlement reads the ledger only and applies attribution policy', async () => {
    const record = new RecordCostAdjustmentUseCase(adjustmentRepo, ledgerRepo);
    await record.execute({
      deliveryJobId: 'djb-1', event: 'SUPPLIER_NOT_READY', amountTzs: 800,
      reason: 'seller late', recordedBy: 'ops', pricingVersion: 2,
    });
    await record.execute({
      deliveryJobId: 'djb-1', event: 'CUSTOMER_UNREACHABLE', amountTzs: 500,
      reason: 'not home', recordedBy: 'ops', pricingVersion: 2,
    });
    const complete = new RecordJobCompletionLedgerUseCase(ledgerRepo);
    await complete.execute({
      deliveryJobId: 'djb-1',
      buyerPriceTzs: 6000, actualFulfillmentCostTzs: 4500,
      driverCompensationTzs: 2500,
      buyerId: 'buy-1', driverId: 'drv-1', pricingVersion: 2,
    });

    const settle = new SettleDeliveryJobUseCase(ledgerRepo);
    const result = await settle.execute({
      deliveryJobId: 'djb-1',
      variancePolicy: { maysarAbsorbsUpToTzs: 0, customerChargeableVarianceTypes: [] },
    });
    expect(result.driverPayableTzs).toBe(2500);
    expect(result.buyerChargeTzs).toBe(6000);
    expect(result.supplierDeductionsTzs).toBe(800);  // deducted from supplier
    expect(result.customerRecoverableTzs).toBe(0);   // not covered by policy → not charged
    expect(result.maysarRevenueTzs).toBe(1500);      // Maysar not absorbing the uncovered 500
    expect(result.warnings.some(w => w.includes('not covered'))).toBe(true);
    expect(result.adjustmentsApplied).toBe(2);
  });
});