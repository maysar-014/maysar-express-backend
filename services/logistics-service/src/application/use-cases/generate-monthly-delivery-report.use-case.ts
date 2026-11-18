/**
 * GenerateMonthlyDeliveryReportUseCase (MYS-DEL-001 Articles 34–38)
 *
 * Produces the mandatory monthly delivery economics report.
 * First scheduled review: 1 December 2026, 09:00 Africa/Dar_es_Salaam.
 * Schedule: first day of every month thereafter.
 *
 * Data sources:
 *   - Logistics ledger (BUYER_LOGISTICS_CHARGE, CARRIER_PAYABLE,
 *     MAYSAR_LOGISTICS_REVENUE, CONSOLIDATION_SAVING, ADJUSTMENT)
 *   - Pricing audit records (quoted vs actual comparison)
 *   - Logistics shipments (outcome codes, failure rates)
 *
 * When data is absent or incomplete for a reporting period the report is
 * still produced — per Article 37, it must explain the limitation rather
 * than be silently skipped.
 *
 * Report covers Articles 34A–E:
 *   A. Customer economics
 *   B. Driver economics
 *   C. Merchant economics
 *   D. Platform economics
 *   E. Operational efficiency
 */

export interface MonthlyReportPeriod {
  year: number;
  month: number; // 1–12
}

export interface CustomerEconomics {
  averageDeliveryFeeTzs: number | null;
  medianDeliveryFeeTzs: number | null;
  totalDeliveriesQuoted: number;
  deliveryFeeByZone: Record<string, number>;
  dataQualityNote: string;
}

export interface DriverEconomics {
  averageGrossPayoutTzs: number | null;
  totalDriverPayoutsTzs: number;
  deliveriesWithRealTariff: number;
  deliveriesWithPlaceholderRate: number;
  dataQualityNote: string;
}

export interface PlatformEconomics {
  totalFundingTzs: number;
  totalVariableCostsTzs: number;
  platformContributionTzs: number;
  contributionMarginPct: number | null;
  subsidyTotalTzs: number;
  lossCount: number;
  unverifiedCount: number;
  profitableCount: number;
  consolidationSavingsTzs: number;
  dataQualityNote: string;
}

export interface OperationalEfficiency {
  completedCount: number;
  cancelledCount: number;
  failedCount: number;
  returnedCount: number;
  completionRatePct: number | null;
  dataQualityNote: string;
}

export interface ReconciliationSummary {
  deliveriesReconciled: number;
  materialDeviationCount: number;
  avgDistanceDeviationPct: number | null;
  avgDriverPayoutDeviationPct: number | null;
  dataQualityNote: string;
}

export interface MonthlyDeliveryReport {
  /** Report document identifier. */
  reportId: string;
  period: MonthlyReportPeriod;
  generatedAt: Date;
  /** True when the platform was pre-launch and no live deliveries existed. */
  isPreLaunch: boolean;
  customerEconomics: CustomerEconomics;
  driverEconomics: DriverEconomics;
  platformEconomics: PlatformEconomics;
  operationalEfficiency: OperationalEfficiency;
  reconciliation: ReconciliationSummary;
  /**
   * Missing or unreliable data fields — Article 37 mandates these are
   * named explicitly rather than silently omitted from the report.
   */
  dataLimitations: string[];
  /** Prioritized corrective actions identified from this period's data. */
  correctiveActions: string[];
}

/** Minimal repository contract needed by the report generator. */
export interface MonthlyReportDataSource {
  /**
   * Aggregate ledger data for the given calendar month.
   * Returns null when no ledger entries exist for the period.
   */
  aggregateLedgerForMonth(year: number, month: number): Promise<{
    totalBuyerChargesTzs: number;
    totalCarrierPayablesTzs: number;
    totalMaysarRevenueTzs: number;
    totalSubsidyTzs: number;
    totalConsolidationSavingsTzs: number;
    totalAdjustmentsTzs: number;
    entryCount: number;
    buyerFees: number[];           // array of individual buyer fees for median/avg
    carrierPayouts: number[];      // array of individual payouts
  } | null>;

  /**
   * Shipment outcome summary for the given calendar month.
   */
  aggregateShipmentOutcomesForMonth(year: number, month: number): Promise<{
    completedCount: number;
    cancelledCount: number;
    failedCount: number;
    returnedCount: number;
    totalCount: number;
  } | null>;

  /**
   * Feasibility classification summary from quote breakdowns for the month.
   */
  aggregateClassificationsForMonth(year: number, month: number): Promise<{
    profitableCount: number;
    breakEvenCount: number;
    subsidizedCount: number;
    lossMakingCount: number;
    unverifiedCount: number;
    realTariffCount: number;      // quotes where VehicleTariff was active
    placeholderCount: number;     // quotes using mock rates
  } | null>;

  /**
   * Reconciliation deviation summary for the month.
   */
  aggregateReconciliationsForMonth(year: number, month: number): Promise<{
    reconciledCount: number;
    materialDeviationCount: number;
    distanceDeviations: number[];
    driverPayoutDeviations: number[];
  } | null>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const avg = (arr: number[]) => arr.length > 0 ? round2(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
const median = (arr: number[]) => {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? round2((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
};

export class GenerateMonthlyDeliveryReportUseCase {
  constructor(private readonly dataSource: MonthlyReportDataSource) {}

  async execute(period: MonthlyReportPeriod): Promise<MonthlyDeliveryReport> {
    const generatedAt = new Date();
    const reportId = `MDR-${period.year}${String(period.month).padStart(2, '0')}-${Date.now()}`;
    const dataLimitations: string[] = [];
    const correctiveActions: string[] = [];

    // ── Load all data sources in parallel ─────────────────────────────────
    const [ledger, outcomes, classifications, reconciliations] = await Promise.all([
      this.dataSource.aggregateLedgerForMonth(period.year, period.month).catch(() => null),
      this.dataSource.aggregateShipmentOutcomesForMonth(period.year, period.month).catch(() => null),
      this.dataSource.aggregateClassificationsForMonth(period.year, period.month).catch(() => null),
      this.dataSource.aggregateReconciliationsForMonth(period.year, period.month).catch(() => null),
    ]);

    const isPreLaunch = !ledger && !outcomes;

    if (isPreLaunch) {
      dataLimitations.push(
        'Platform is pre-launch or no deliveries occurred this period. '
        + 'All metrics are zero or null. This report satisfies the Article 37 '
        + 'requirement to produce a report even when no data exists.',
      );
    }

    // ── A. Customer Economics ──────────────────────────────────────────────
    if (!ledger) dataLimitations.push('Ledger data unavailable — customer fee metrics cannot be computed.');
    const customerEconomics: CustomerEconomics = {
      averageDeliveryFeeTzs: ledger ? avg(ledger.buyerFees) : null,
      medianDeliveryFeeTzs: ledger ? median(ledger.buyerFees) : null,
      totalDeliveriesQuoted: ledger?.entryCount ?? 0,
      deliveryFeeByZone: {},  // zone breakdown requires ledger entry metadata join — deferred
      dataQualityNote: ledger
        ? `Based on ${ledger.entryCount} ledger entries.`
        : 'No ledger data for this period.',
    };

    if (ledger && ledger.buyerFees.length === 0) {
      dataLimitations.push('Buyer fee array is empty — average/median cannot be computed despite ledger entries existing.');
    }

    // ── B. Driver Economics ────────────────────────────────────────────────
    const driverEconomics: DriverEconomics = {
      averageGrossPayoutTzs: ledger ? avg(ledger.carrierPayouts) : null,
      totalDriverPayoutsTzs: ledger?.totalCarrierPayablesTzs ?? 0,
      deliveriesWithRealTariff: classifications?.realTariffCount ?? 0,
      deliveriesWithPlaceholderRate: classifications?.placeholderCount ?? 0,
      dataQualityNote: classifications
        ? `${classifications.realTariffCount} of ${(classifications.realTariffCount + classifications.placeholderCount)} quotes used real VehicleTariff.`
        : 'Classification data unavailable.',
    };

    if (classifications && classifications.placeholderCount > 0) {
      dataLimitations.push(
        `${classifications.placeholderCount} deliveries used placeholder (mock) driver compensation rates. `
        + 'Net driver earnings cannot be reliably estimated for these. '
        + 'Seed a VehicleTariff and run seed-vehicle-tariff.ts to activate real rates.',
      );
      correctiveActions.push(
        'PRIORITY 1: Run scripts/seed-vehicle-tariff.ts to activate the three-engine pipeline '
        + 'and replace mock driver compensation rates with real tariff-backed figures.',
      );
    }

    // ── C. Merchant Economics (placeholder — data source not yet complete) ─
    // Merchant contributions are tracked at quote time (EXPECTED) and confirmed
    // at settlement. The full merchant economics view requires a confirmed-
    // contribution aggregation query that will be added in Phase 2 of reporting.
    dataLimitations.push(
      'Merchant contribution economics: confirmed vs expected comparison not yet implemented. '
      + 'Available from settlement data once MerchantContributionEngine.confirm() is called at settlement.',
    );

    // ── D. Platform Economics ──────────────────────────────────────────────
    const totalFunding = ledger?.totalBuyerChargesTzs ?? 0;
    const totalCosts = Math.abs(ledger?.totalCarrierPayablesTzs ?? 0);
    const contribution = round2(totalFunding - totalCosts);
    const margin = totalFunding > 0 ? round2((contribution / totalFunding) * 100) : null;

    const platformEconomics: PlatformEconomics = {
      totalFundingTzs: totalFunding,
      totalVariableCostsTzs: totalCosts,
      platformContributionTzs: contribution,
      contributionMarginPct: margin,
      subsidyTotalTzs: ledger?.totalSubsidyTzs ?? 0,
      lossCount: classifications?.lossMakingCount ?? 0,
      unverifiedCount: classifications?.unverifiedCount ?? 0,
      profitableCount: classifications?.profitableCount ?? 0,
      consolidationSavingsTzs: ledger?.totalConsolidationSavingsTzs ?? 0,
      dataQualityNote: ledger
        ? 'Computed from ledger entries. Payment/COD cost not included (not yet tracked at job level).'
        : 'No ledger data.',
    };

    if (!ledger) {
      dataLimitations.push('Platform contribution and margin cannot be computed — no ledger entries exist.');
    }
    dataLimitations.push(
      'Payment processing and COD costs are not yet tracked at the delivery-job ledger level. '
      + 'Contribution margin is therefore overstated by those amounts.',
    );

    if (classifications && classifications.lossMakingCount > 0) {
      correctiveActions.push(
        `REVIEW: ${classifications.lossMakingCount} loss-making deliveries this period. `
        + 'Investigate route-level economics and consider pricing adjustment or route retirement.',
      );
    }

    // ── E. Operational Efficiency ──────────────────────────────────────────
    const total = outcomes?.totalCount ?? 0;
    const completionRate = total > 0
      ? round2(((outcomes?.completedCount ?? 0) / total) * 100)
      : null;

    const operationalEfficiency: OperationalEfficiency = {
      completedCount: outcomes?.completedCount ?? 0,
      cancelledCount: outcomes?.cancelledCount ?? 0,
      failedCount: outcomes?.failedCount ?? 0,
      returnedCount: outcomes?.returnedCount ?? 0,
      completionRatePct: completionRate,
      dataQualityNote: outcomes
        ? `Based on ${total} shipments with constitutional outcome codes.`
        : 'No shipment outcome data — outcomeCode column may not be populated yet.',
    };

    if (!outcomes) {
      dataLimitations.push(
        'Shipment outcome data unavailable. '
        + 'Ensure Logistics_Shipment.outcomeCode is populated on terminal transitions.',
      );
      correctiveActions.push(
        'PRIORITY 2: Update shipment terminal transitions to call markFailed(reason, outcomeCode) '
        + 'and settle() so the outcomeCode column is populated for future reporting.',
      );
    }

    // ── Reconciliation Summary ─────────────────────────────────────────────
    const reconciliation: ReconciliationSummary = {
      deliveriesReconciled: reconciliations?.reconciledCount ?? 0,
      materialDeviationCount: reconciliations?.materialDeviationCount ?? 0,
      avgDistanceDeviationPct: reconciliations ? avg(reconciliations.distanceDeviations) : null,
      avgDriverPayoutDeviationPct: reconciliations ? avg(reconciliations.driverPayoutDeviations) : null,
      dataQualityNote: reconciliations
        ? `${reconciliations.reconciledCount} deliveries reconciled.`
        : 'No reconciliation records — ReconcileDeliveryQuoteUseCase not yet invoked post-delivery.',
    };

    if (!reconciliations || reconciliations.reconciledCount === 0) {
      dataLimitations.push(
        'No actual-vs-quoted reconciliation data. '
        + 'Wire ReconcileDeliveryQuoteUseCase into the delivery-completed event handler.',
      );
    }

    return {
      reportId,
      period,
      generatedAt,
      isPreLaunch,
      customerEconomics,
      driverEconomics,
      platformEconomics,
      operationalEfficiency,
      reconciliation,
      dataLimitations,
      correctiveActions,
    };
  }
}
