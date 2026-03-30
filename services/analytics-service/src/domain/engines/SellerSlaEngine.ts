export type SellerSlaConfidence = 'direct' | 'derived' | 'manual';

export type SellerSlaMetricStatus = 'compliant' | 'at_risk' | 'breached' | 'manual';

export type SellerSlaCoverageStatus = 'implemented' | 'partial' | 'missing';

export type SellerSlaReadinessStatus = 'passed' | 'failed' | 'manual';

export type SellerSlaReportStatus = 'healthy' | 'watch' | 'critical' | 'manual';

export type SellerSlaEvaluationMode = 'report' | 'evaluate';

export interface SellerSlaMetricAssessment {
  key: string;
  clause: string;
  title: string;
  actual: number | null;
  target: number;
  comparison: 'higher' | 'lower';
  unit: string;
  score: number | null;
  status: SellerSlaMetricStatus;
  confidence: SellerSlaConfidence;
  weight: number;
  evidence: string[];
  notes: string[];
}

export interface SellerSlaBreach {
  key: string;
  clause: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  expected: string;
  observed: string;
  recommendation: string;
  confidence: SellerSlaConfidence;
}

export interface SellerSlaReadinessGate {
  key: string;
  label: string;
  passed: boolean;
  status: SellerSlaReadinessStatus;
  confidence: SellerSlaConfidence;
  evidence: string[];
  blocker: string;
}

export interface SellerSlaCoverageItem {
  clause: string;
  status: SellerSlaCoverageStatus;
  confidence: SellerSlaConfidence;
  notes: string[];
}

export interface SellerSlaSummary {
  totalMetrics: number;
  compliantMetrics: number;
  atRiskMetrics: number;
  breachedMetrics: number;
  manualMetrics: number;
  totalReadinessGates: number;
  passedReadinessGates: number;
  failedReadinessGates: number;
  manualReadinessGates: number;
}

export interface SellerSlaReport {
  sellerId: string;
  evaluatedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  overallComplianceScore: number;
  goLiveReadinessScore: number;
  dataCoverageScore: number;
  status: SellerSlaReportStatus;
  summary: SellerSlaSummary;
  metrics: SellerSlaMetricAssessment[];
  breaches: SellerSlaBreach[];
  readiness: SellerSlaReadinessGate[];
  coverage: SellerSlaCoverageItem[];
  recommendations: string[];
}

export interface SellerSlaFacts {
  sellerId: string;
  periodStart: Date;
  periodEnd: Date;
  now: Date;
  totalOrders: number;
  confirmedOnTimeOrders: number;
  pendingOverdueOrders: number;
  cancelledOrders: number;
  dispatchTotal: number;
  dispatchOnTime: number;
  dispatchLate: number;
  inventoryTotal: number;
  inventoryInStock: number;
  inventoryLowStock: number;
  inventoryOutOfStock: number;
  catalogTotal: number;
  catalogPublished: number;
  catalogAverageCompleteness: number | null;
  catalogAverageQualityScore: number | null;
  catalogProductsWithMedia: number;
  catalogProductsWithDescription: number;
  catalogProductsWithVariants: number;
  customerTicketsTotal: number;
  customerTicketsRespondedWithin30: number;
  urgentTicketsTotal: number;
  urgentTicketsRespondedWithin15: number;
  averageFirstResponseMinutes: number | null;
  supportOpenHighOver4h: number;
  supportOpenMediumOver24h: number;
  supportOpenUnassignedOver1h: number;
  deliveriesTotal: number;
  deliveriesOnTime: number;
  deliveriesLate: number;
  averageDeliveryDelayHours: number | null;
  refundsTotal: number;
  refundsCompletedWithin48h: number;
  averageRefundProcessingHours: number | null;
  refundRate: number | null;
  businessPresent: boolean;
  businessActive: boolean;
  businessVerified: boolean;
  businessCompliant: boolean;
  businessDocumentsApproved: number;
  businessDocumentsTotal: number;
}

const BUSINESS_TIME_ZONE = 'Africa/Dar_es_Salaam';

const METRIC_WEIGHTS: Record<string, number> = {
  order_confirmation: 14,
  dispatch_timeline: 14,
  cancellation_control: 8,
  inventory_accuracy: 10,
  listing_maintenance: 10,
  customer_response: 15,
  delivery_punctuality: 6,
  product_quality: 5,
  refund_processing: 8,
  support_escalation: 5,
  business_compliance: 5,
  go_live_readiness: 0
};

const toFixedNumber = (value: number): number => Number(value.toFixed(2));

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const percentage = (part: number, total: number): number | null => {
  if (total <= 0) return null;
  return (part / total) * 100;
};

const scoreHigherIsBetter = (actual: number | null, target: number): number | null => {
  if (actual === null) return null;
  if (target <= 0) return 100;
  return clamp((actual / target) * 100, 0, 100);
};

const scoreLowerIsBetter = (actual: number | null, target: number): number | null => {
  if (actual === null) return null;
  if (actual <= 0) return 100;
  return clamp((target / actual) * 100, 0, 100);
};

const getTimeZoneParts = (date: Date): Intl.DateTimeFormatPart[] => {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short'
  });

  return formatter.formatToParts(date);
};

const getTimeZoneValue = (date: Date, type: Intl.DateTimeFormatPartTypes): string => {
  const part = getTimeZoneParts(date).find(entry => entry.type === type);
  return part?.value ?? '';
};

const getLocalDateKey = (date: Date): string => {
  const year = getTimeZoneValue(date, 'year');
  const month = getTimeZoneValue(date, 'month');
  const day = getTimeZoneValue(date, 'day');
  return `${year}-${month}-${day}`;
};

const getLocalHour = (date: Date): number => Number(getTimeZoneValue(date, 'hour') || 0);

const hoursBetween = (start: Date, end: Date): number => (end.getTime() - start.getTime()) / (1000 * 60 * 60);

const minutesBetween = (start: Date, end: Date): number => (end.getTime() - start.getTime()) / (1000 * 60);

const createMetric = (params: {
  key: string;
  clause: string;
  title: string;
  actual: number | null;
  target: number;
  comparison: 'higher' | 'lower';
  unit: string;
  confidence: SellerSlaConfidence;
  weight?: number;
  evidence?: string[];
  notes?: string[];
}): SellerSlaMetricAssessment => {
  const weight = params.weight ?? METRIC_WEIGHTS[params.key] ?? 0;
  const score = params.comparison === 'higher'
    ? scoreHigherIsBetter(params.actual, params.target)
    : scoreLowerIsBetter(params.actual, params.target);

  let status: SellerSlaMetricStatus = 'manual';
  if (params.actual === null) {
    status = 'manual';
  } else if (score !== null && score >= 100) {
    status = 'compliant';
  } else if (score !== null && score >= 85) {
    status = 'at_risk';
  } else {
    status = 'breached';
  }

  return {
    key: params.key,
    clause: params.clause,
    title: params.title,
    actual: params.actual === null ? null : toFixedNumber(params.actual),
    target: params.target,
    comparison: params.comparison,
    unit: params.unit,
    score: score === null ? null : toFixedNumber(score),
    status,
    confidence: params.confidence,
    weight,
    evidence: params.evidence ?? [],
    notes: params.notes ?? []
  };
};

const buildBreach = (metric: SellerSlaMetricAssessment): SellerSlaBreach | null => {
  if (metric.status === 'compliant' || metric.status === 'manual') {
    return null;
  }

  const severity = metric.status === 'breached'
    ? (metric.score !== null && metric.score < 50 ? 'critical' : metric.score !== null && metric.score < 75 ? 'high' : 'medium')
    : 'low';

  const actualText = metric.actual === null ? 'No assessed data' : `${metric.actual}${metric.unit}`;
  const expectedText = metric.comparison === 'higher'
    ? `At least ${metric.target}${metric.unit}`
    : `No more than ${metric.target}${metric.unit}`;

  return {
    key: metric.key,
    clause: metric.clause,
    title: metric.title,
    severity,
    expected: expectedText,
    observed: actualText,
    recommendation: metric.notes[0] || `Review ${metric.title.toLowerCase()} and close the gap before it impacts seller SLA compliance.`,
    confidence: metric.confidence
  };
};

const buildReadinessGate = (params: {
  key: string;
  label: string;
  passed: boolean;
  confidence: SellerSlaConfidence;
  evidence: string[];
  blocker: string;
}): SellerSlaReadinessGate => ({
  key: params.key,
  label: params.label,
  passed: params.passed,
  status: params.passed ? 'passed' : params.confidence === 'manual' ? 'manual' : 'failed',
  confidence: params.confidence,
  evidence: params.evidence,
  blocker: params.blocker
});

export class SellerSlaEngine {
  assess(facts: SellerSlaFacts, mode: SellerSlaEvaluationMode = 'report'): SellerSlaReport {
    const metrics = [
      createMetric({
        key: 'order_confirmation',
        clause: 'Order Processing Standards',
        title: 'Order confirmation SLA',
        actual: percentage(facts.confirmedOnTimeOrders, facts.totalOrders),
        target: 95,
        comparison: 'higher',
        unit: '%',
        confidence: facts.totalOrders > 0 ? 'derived' : 'manual',
        evidence: [
          `${facts.confirmedOnTimeOrders}/${facts.totalOrders} orders tracked within the confirmation window`,
          `${facts.pendingOverdueOrders} orders are still pending beyond the 2-hour threshold`
        ],
        notes: [
          'The current schema does not expose a confirmedAt timestamp, so this is derived from live order state and overdue backlog.'
        ]
      }),
      createMetric({
        key: 'dispatch_timeline',
        clause: 'Order Processing Standards',
        title: 'Dispatch timeline SLA',
        actual: percentage(facts.dispatchOnTime, facts.dispatchTotal),
        target: 90,
        comparison: 'higher',
        unit: '%',
        confidence: facts.dispatchTotal > 0 ? 'derived' : 'manual',
        evidence: [
          `${facts.dispatchOnTime}/${facts.dispatchTotal} deliveries are dispatch-compliant`,
          `${facts.dispatchLate} dispatches are outside the 24-hour window`
        ],
        notes: [
          'Dispatch time is approximated from the delivery record createdAt because a dedicated dispatch timestamp is not stored.'
        ]
      }),
      createMetric({
        key: 'cancellation_control',
        clause: 'Order Processing Standards',
        title: 'Cancellation control',
        actual: percentage(facts.cancelledOrders, facts.totalOrders),
        target: 5,
        comparison: 'lower',
        unit: '%',
        confidence: facts.totalOrders > 0 ? 'direct' : 'manual',
        evidence: [
          `${facts.cancelledOrders}/${facts.totalOrders} orders are cancelled in the current window`
        ],
        notes: [
          'The SLA allows a maximum cancellation rate of 5% per month.'
        ]
      }),
      createMetric({
        key: 'inventory_accuracy',
        clause: 'Inventory Management',
        title: 'Inventory accuracy',
        actual: percentage(facts.inventoryInStock, facts.inventoryTotal),
        target: 95,
        comparison: 'higher',
        unit: '%',
        confidence: facts.inventoryTotal > 0 ? 'derived' : 'manual',
        evidence: [
          `${facts.inventoryInStock}/${facts.inventoryTotal} tracked inventory records are marked in stock`,
          `${facts.inventoryLowStock} products are low stock`,
          `${facts.inventoryOutOfStock} products are out of stock`
        ],
        notes: [
          'This is derived from the inventory health table rather than a warehouse reconciliation system.'
        ]
      }),
      createMetric({
        key: 'listing_maintenance',
        clause: 'Inventory Management',
        title: 'Listing maintenance',
        actual: facts.catalogAverageCompleteness,
        target: 90,
        comparison: 'higher',
        unit: '%',
        confidence: facts.catalogTotal > 0 ? 'derived' : 'manual',
        evidence: [
          `${facts.catalogPublished}/${facts.catalogTotal} products are published`,
          `${facts.catalogProductsWithDescription} products have descriptions`,
          `${facts.catalogProductsWithMedia} products have media`,
          `${facts.catalogProductsWithVariants} products have variants`
        ],
        notes: [
          'Listing completeness is derived from product content, media presence, and published status.'
        ]
      }),
      createMetric({
        key: 'customer_response',
        clause: 'Customer Communication',
        title: 'Customer response SLA',
        actual: percentage(facts.customerTicketsRespondedWithin30, facts.customerTicketsTotal),
        target: 95,
        comparison: 'higher',
        unit: '%',
        confidence: facts.customerTicketsTotal > 0 ? 'derived' : 'manual',
        evidence: [
          `${facts.customerTicketsRespondedWithin30}/${facts.customerTicketsTotal} customer inquiries received a first response within 30 minutes`,
          `${facts.urgentTicketsRespondedWithin15}/${facts.urgentTicketsTotal} urgent matters were handled within 15 minutes`
        ],
        notes: [
          'Response time is based on the first visible agent reply in the ticket thread.'
        ]
      }),
      createMetric({
        key: 'delivery_punctuality',
        clause: 'Packaging and Delivery',
        title: 'Delivery punctuality',
        actual: percentage(facts.deliveriesOnTime, facts.deliveriesTotal),
        target: 90,
        comparison: 'higher',
        unit: '%',
        confidence: facts.deliveriesTotal > 0 ? 'derived' : 'manual',
        evidence: [
          `${facts.deliveriesOnTime}/${facts.deliveriesTotal} deliveries met the estimated delivery time`,
          `${facts.deliveriesLate} deliveries were late`
        ],
        notes: [
          'Delivery punctuality is a delivery-operation proxy; packaging quality itself is not directly tracked in the current schema.'
        ]
      }),
      createMetric({
        key: 'product_quality',
        clause: 'Product Quality Standards',
        title: 'Product quality score',
        actual: facts.catalogAverageQualityScore,
        target: 80,
        comparison: 'higher',
        unit: '%',
        confidence: facts.catalogTotal > 0 ? 'derived' : 'manual',
        evidence: [
          `Average catalog quality score: ${facts.catalogAverageQualityScore === null ? 'n/a' : toFixedNumber(facts.catalogAverageQualityScore)}`,
          `${facts.catalogPublished} published products in the catalog`
        ],
        notes: [
          'The platform does not currently store physical inspection outcomes, so quality is derived from the catalog quality score.'
        ]
      }),
      createMetric({
        key: 'refund_processing',
        clause: 'Returns and Refunds',
        title: 'Refund processing SLA',
        actual: percentage(facts.refundsCompletedWithin48h, facts.refundsTotal),
        target: 95,
        comparison: 'higher',
        unit: '%',
        confidence: facts.refundsTotal > 0 ? 'derived' : 'manual',
        evidence: [
          `${facts.refundsCompletedWithin48h}/${facts.refundsTotal} refunds completed within 48 hours`,
          `Refund rate: ${facts.refundRate === null ? 'n/a' : `${toFixedNumber(facts.refundRate)}%`}`
        ],
        notes: [
          'Refund processing is measured from the refund request timestamp to completion or the latest known processing timestamp.'
        ]
      }),
      createMetric({
        key: 'support_escalation',
        clause: 'Support and Escalation',
        title: 'Support escalation compliance',
        actual: facts.customerTicketsTotal > 0
          ? percentage(
              Math.max(
                0,
                facts.customerTicketsTotal - facts.supportOpenHighOver4h - facts.supportOpenMediumOver24h - facts.supportOpenUnassignedOver1h
              ),
              facts.customerTicketsTotal
            )
          : null,
        target: 95,
        comparison: 'higher',
        unit: '%',
        confidence: facts.customerTicketsTotal > 0 ? 'derived' : 'manual',
        evidence: [
          `${facts.supportOpenHighOver4h} high-priority tickets are overdue`,
          `${facts.supportOpenMediumOver24h} medium-priority tickets are overdue`,
          `${facts.supportOpenUnassignedOver1h} tickets are unassigned beyond the initial SLA`
        ],
        notes: [
          'This aligns with the support-service escalation policy and gives an operational view of unresolved support risk.'
        ]
      }),
      createMetric({
        key: 'business_compliance',
        clause: 'Compliance and Conduct',
        title: 'Business compliance readiness',
        actual: facts.businessPresent
          ? (((facts.businessActive ? 1 : 0) + (facts.businessVerified ? 1 : 0) + (facts.businessCompliant ? 1 : 0) + ((percentage(facts.businessDocumentsApproved, facts.businessDocumentsTotal) ?? 0) / 100)) / 4) * 100
          : null,
        target: 95,
        comparison: 'higher',
        unit: '%',
        confidence: facts.businessPresent ? 'direct' : 'manual',
        evidence: facts.businessPresent
          ? [
              `Business active: ${facts.businessActive}`,
              `Business verified: ${facts.businessVerified}`,
              `Business compliant: ${facts.businessCompliant}`,
              `${facts.businessDocumentsApproved}/${facts.businessDocumentsTotal} business documents are approved`
            ]
          : ['No business record was found for the seller.'],
        notes: [
          'This gate is based on the current business registry state, verification status, and approved documents.'
        ]
      }),
      createMetric({
        key: 'go_live_readiness',
        clause: 'Go-Live Gates',
        title: 'Operational readiness',
        actual: null,
        target: 100,
        comparison: 'higher',
        unit: '%',
        confidence: 'manual',
        evidence: [
          'Readiness is derived from gate evaluation rather than a single transactional record.'
        ],
        notes: [
          'The go-live gate summary is calculated from the readiness checklist below.'
        ]
      })
    ];

    const readiness = this.buildReadinessGates(facts);
    const readinessSummary = this.summarizeReadiness(readiness);
    const actionableReadiness = readiness.filter(gate => gate.status !== 'manual');
    const actionableReadinessPassed = actionableReadiness.filter(gate => gate.passed).length;
    const coverage = this.buildCoverage(metrics, readiness, mode);
    const scoreSummary = this.summarizeMetrics(metrics);
    const breaches = metrics.map(buildBreach).filter((breach): breach is SellerSlaBreach => breach !== null);
    const dataCoverageScore = this.calculateCoverageScore(metrics);
    const goLiveReadinessScore = actionableReadiness.length > 0
      ? (actionableReadinessPassed / actionableReadiness.length) * 100
      : 0;
    const overallComplianceScore = scoreSummary.weightedAverage;
    const status = this.resolveStatus({
      metrics,
      readiness,
      overallComplianceScore,
      dataCoverageScore,
      goLiveReadinessScore
    });
    const recommendations = this.buildRecommendations(metrics, readiness, coverage, facts);

    return {
      sellerId: facts.sellerId,
      evaluatedAt: facts.now,
      periodStart: facts.periodStart,
      periodEnd: facts.periodEnd,
      overallComplianceScore: toFixedNumber(overallComplianceScore),
      goLiveReadinessScore: toFixedNumber(goLiveReadinessScore),
      dataCoverageScore: toFixedNumber(dataCoverageScore),
      status,
      summary: {
        totalMetrics: metrics.length,
        compliantMetrics: scoreSummary.compliantMetrics,
        atRiskMetrics: scoreSummary.atRiskMetrics,
        breachedMetrics: scoreSummary.breachedMetrics,
        manualMetrics: scoreSummary.manualMetrics,
        totalReadinessGates: readiness.length,
        passedReadinessGates: readinessSummary.passedReadinessGates,
        failedReadinessGates: readinessSummary.failedReadinessGates,
        manualReadinessGates: readinessSummary.manualReadinessGates
      },
      metrics,
      breaches,
      readiness,
      coverage,
      recommendations
    };
  }

  private buildReadinessGates(facts: SellerSlaFacts): SellerSlaReadinessGate[] {
    const catalogReady = facts.catalogPublished > 0 && (facts.catalogAverageCompleteness ?? 0) >= 90;
    const responseTested = facts.customerTicketsTotal > 0 && (facts.customerTicketsRespondedWithin30 / facts.customerTicketsTotal) * 100 >= 95;
    const refundFlowUnderstood = facts.refundsTotal > 0;

    return [
      buildReadinessGate({
        key: 'signed_agreement',
        label: 'Signed agreement is on file',
        passed: false,
        confidence: 'manual',
        evidence: ['No contractual artifact is exposed in the current schema.'],
        blocker: 'Manual verification required for the signed seller agreement.'
      }),
      buildReadinessGate({
        key: 'payment_setup',
        label: 'Payment setup is verified',
        passed: false,
        confidence: 'manual',
        evidence: ['No payment onboarding state is exposed in the current schema.'],
        blocker: 'Manual verification required for payment setup.'
      }),
      buildReadinessGate({
        key: 'catalog_live',
        label: 'Product catalog is live and accurate',
        passed: catalogReady,
        confidence: facts.catalogTotal > 0 ? 'derived' : 'manual',
        evidence: [
          `${facts.catalogPublished}/${facts.catalogTotal} products are published`,
          `Average catalog completeness: ${facts.catalogAverageCompleteness === null ? 'n/a' : `${toFixedNumber(facts.catalogAverageCompleteness)}%`}`
        ],
        blocker: 'Publish and complete the product catalog before go-live.'
      }),
      buildReadinessGate({
        key: 'response_tested',
        label: 'Response time has been tested',
        passed: responseTested,
        confidence: facts.customerTicketsTotal > 0 ? 'derived' : 'manual',
        evidence: [
          `${facts.customerTicketsRespondedWithin30}/${facts.customerTicketsTotal} inquiries responded to within 30 minutes`
        ],
        blocker: 'Customer response behavior has not yet met the operational benchmark.'
      }),
      buildReadinessGate({
        key: 'returns_understood',
        label: 'Return and refund flow is understood',
        passed: refundFlowUnderstood,
        confidence: facts.refundsTotal > 0 ? 'derived' : 'manual',
        evidence: [
          facts.refundsTotal > 0
            ? `${facts.refundsTotal} refund records were found for the seller`
            : 'No refund records are available in the current lookback window.'
        ],
        blocker: 'Return/refund handling should be demonstrated or documented before go-live.'
      }),
      buildReadinessGate({
        key: 'maysar_confirmation',
        label: 'Maysar confirms operational readiness',
        passed: false,
        confidence: 'manual',
        evidence: ['This confirmation is intentionally left as a platform approval step.'],
        blocker: 'Platform approval is required before go-live.'
      }),
      buildReadinessGate({
        key: 'business_compliant',
        label: 'Business registration and compliance are verified',
        passed: facts.businessPresent && facts.businessActive && facts.businessVerified && facts.businessCompliant,
        confidence: facts.businessPresent ? 'direct' : 'manual',
        evidence: facts.businessPresent
          ? [
              `Business active: ${facts.businessActive}`,
              `Business verified: ${facts.businessVerified}`,
              `Business compliant: ${facts.businessCompliant}`,
              `${facts.businessDocumentsApproved}/${facts.businessDocumentsTotal} business documents are approved`
            ]
          : ['No business record found for the seller.'],
        blocker: 'Business registry status is not ready for live trading.'
      })
    ];
  }

  private summarizeMetrics(metrics: SellerSlaMetricAssessment[]): {
    weightedAverage: number;
    compliantMetrics: number;
    atRiskMetrics: number;
    breachedMetrics: number;
    manualMetrics: number;
  } {
    let weightedScore = 0;
    let totalWeight = 0;
    let compliantMetrics = 0;
    let atRiskMetrics = 0;
    let breachedMetrics = 0;
    let manualMetrics = 0;

    for (const metric of metrics) {
      if (metric.status === 'manual') {
        manualMetrics += 1;
      } else if (metric.status === 'compliant') {
        compliantMetrics += 1;
      } else if (metric.status === 'at_risk') {
        atRiskMetrics += 1;
      } else {
        breachedMetrics += 1;
      }

      if (metric.score !== null) {
        weightedScore += metric.score * metric.weight;
        totalWeight += metric.weight;
      }
    }

    return {
      weightedAverage: totalWeight > 0 ? weightedScore / totalWeight : 0,
      compliantMetrics,
      atRiskMetrics,
      breachedMetrics,
      manualMetrics
    };
  }

  private summarizeReadiness(readiness: SellerSlaReadinessGate[]): {
    passedReadinessGates: number;
    failedReadinessGates: number;
    manualReadinessGates: number;
  } {
    let passedReadinessGates = 0;
    let failedReadinessGates = 0;
    let manualReadinessGates = 0;

    for (const gate of readiness) {
      if (gate.status === 'passed') {
        passedReadinessGates += 1;
      } else if (gate.status === 'manual') {
        manualReadinessGates += 1;
      } else {
        failedReadinessGates += 1;
      }
    }

    return {
      passedReadinessGates,
      failedReadinessGates,
      manualReadinessGates
    };
  }

  private calculateCoverageScore(metrics: SellerSlaMetricAssessment[]): number {
    const totalWeight = metrics.reduce((sum, metric) => sum + metric.weight, 0);
    const coveredWeight = metrics.reduce(
      (sum, metric) => sum + (metric.confidence === 'manual' ? 0 : metric.weight),
      0
    );

    if (totalWeight <= 0) {
      return 0;
    }

    return (coveredWeight / totalWeight) * 100;
  }

  private buildCoverage(
    metrics: SellerSlaMetricAssessment[],
    readiness: SellerSlaReadinessGate[],
    mode: SellerSlaEvaluationMode
  ): SellerSlaCoverageItem[] {
    const hasOperationalData = metrics.some(metric => metric.confidence !== 'manual');
    const hasSupportData = metrics.some(metric => metric.key === 'customer_response' && metric.confidence !== 'manual');
    const hasInventoryData = metrics.some(metric => metric.key === 'inventory_accuracy' && metric.confidence !== 'manual');
    const hasRefundData = metrics.some(metric => metric.key === 'refund_processing' && metric.confidence !== 'manual');
    const hasBusinessData = metrics.some(metric => metric.key === 'business_compliance' && metric.confidence !== 'manual');
    const readinessHasManualGates = readiness.some(gate => gate.confidence === 'manual');
    const readinessHasDerivedGates = readiness.some(gate => gate.confidence === 'derived');

    return [
      {
        clause: 'Order Processing Standards',
        status: hasOperationalData ? 'partial' : 'missing',
        confidence: hasOperationalData ? 'derived' : 'manual',
        notes: [
          'Confirmation, dispatch, and cancellation are tracked from live order and logistics data.',
          'A dedicated confirmedAt timestamp is not yet stored.'
        ]
      },
      {
        clause: 'Inventory Management',
        status: hasInventoryData ? 'implemented' : 'missing',
        confidence: hasInventoryData ? 'derived' : 'manual',
        notes: [
          'Stock health is derived from the seller inventory health table.'
        ]
      },
      {
        clause: 'Customer Communication',
        status: hasSupportData ? 'implemented' : 'missing',
        confidence: hasSupportData ? 'derived' : 'manual',
        notes: [
          'Response timing is measured from support tickets and the first visible agent response.'
        ]
      },
      {
        clause: 'Packaging and Delivery',
        status: hasOperationalData ? 'partial' : 'missing',
        confidence: hasOperationalData ? 'derived' : 'manual',
        notes: [
          'Delivery punctuality is tracked, but packaging quality is still manual.'
        ]
      },
      {
        clause: 'Product Quality Standards',
        status: metrics.some(metric => metric.key === 'product_quality' && metric.confidence !== 'manual') ? 'partial' : 'missing',
        confidence: metrics.some(metric => metric.key === 'product_quality' && metric.confidence !== 'manual') ? 'derived' : 'manual',
        notes: [
          'The quality score is derived from catalog quality data, not from physical inspection.'
        ]
      },
      {
        clause: 'Returns and Refunds',
        status: hasRefundData ? 'implemented' : 'missing',
        confidence: hasRefundData ? 'derived' : 'manual',
        notes: [
          'Refund timing is tracked from request to processing/completion timestamps.'
        ]
      },
      {
        clause: 'Performance Metrics',
        status: hasOperationalData && hasSupportData && hasInventoryData ? 'implemented' : 'partial',
        confidence: 'derived',
        notes: [
          'The report includes operational KPI coverage, but customer satisfaction and review metrics remain incomplete.'
        ]
      },
      {
        clause: 'Review Management',
        status: 'missing',
        confidence: 'manual',
        notes: [
          'No review response model exists in the current schema.'
        ]
      },
      {
        clause: 'Compliance and Conduct',
        status: hasBusinessData ? 'partial' : 'missing',
        confidence: hasBusinessData ? 'direct' : 'manual',
        notes: [
          'Business registry status is available, but agreement-level obligations remain manual.'
        ]
      },
      {
        clause: 'Support and Escalation',
        status: hasSupportData ? 'implemented' : 'partial',
        confidence: hasSupportData ? 'derived' : 'manual',
        notes: [
          'Support escalation thresholds are evaluated from the support-service SLA policy.'
        ]
      },
      {
        clause: 'Continuous Improvement',
        status: 'missing',
        confidence: 'manual',
        notes: [
          'Training, feedback, and review loops are not yet captured as structured SLA signals.'
        ]
      },
      {
        clause: 'SLA Enforcement',
        status: mode === 'evaluate' ? 'implemented' : 'partial',
        confidence: mode === 'evaluate' ? 'derived' : 'manual',
        notes: [
          'The evaluation endpoint creates structured action items and an audit event for breaches.'
        ]
      },
      {
        clause: 'Go-Live Gates',
        status: readinessHasManualGates || readinessHasDerivedGates ? 'partial' : 'implemented',
        confidence: readinessHasManualGates ? 'manual' : 'derived',
        notes: [
          'Operational readiness is determined by the gate checklist exposed by the API.'
        ]
      }
    ];
  }

  private buildRecommendations(
    metrics: SellerSlaMetricAssessment[],
    readiness: SellerSlaReadinessGate[],
    coverage: SellerSlaCoverageItem[],
    facts: SellerSlaFacts
  ): string[] {
    const recommendations = new Set<string>();

    for (const breach of metrics.filter(metric => metric.status !== 'compliant' && metric.status !== 'manual')) {
      if (breach.key === 'order_confirmation') {
        recommendations.add('Reduce the pending-order backlog and confirm new orders within the 2-hour window.');
      }
      if (breach.key === 'dispatch_timeline') {
        recommendations.add('Move confirmed orders into dispatch faster and keep delivery records aligned with the same-day/next-day rule.');
      }
      if (breach.key === 'customer_response') {
        recommendations.add('Assign support ownership so new inquiries receive a first response inside 30 minutes.');
      }
      if (breach.key === 'inventory_accuracy') {
        recommendations.add('Reconcile stock records and maintain a 2-3 unit safety buffer on fast-moving products.');
      }
      if (breach.key === 'refund_processing') {
        recommendations.add('Tighten refund handling so completion happens inside the 48-hour window.');
      }
    }

    for (const gate of readiness.filter(gate => !gate.passed)) {
      recommendations.add(`Resolve the go-live gate: ${gate.label.toLowerCase()}.`);
    }

    for (const item of coverage.filter(item => item.status === 'missing')) {
      recommendations.add(`Add structured tracking for ${item.clause.toLowerCase()}.`);
    }

    if (facts.businessPresent && !facts.businessVerified) {
      recommendations.add('Complete business verification before marketing the seller as operationally ready.');
    }

    if (recommendations.size === 0) {
      recommendations.add('Maintain the current SLA posture and keep the evaluation job running on a fixed cadence.');
    }

    return Array.from(recommendations);
  }

  private resolveStatus(params: {
    metrics: SellerSlaMetricAssessment[];
    readiness: SellerSlaReadinessGate[];
    overallComplianceScore: number;
    dataCoverageScore: number;
    goLiveReadinessScore: number;
  }): SellerSlaReportStatus {
    const metricBreaches = params.metrics.filter(metric => metric.status === 'breached').length;
    const atRisk = params.metrics.filter(metric => metric.status === 'at_risk').length;
    const failedReadiness = params.readiness.filter(gate => gate.status === 'failed').length;
    const manualReadiness = params.readiness.filter(gate => gate.status === 'manual').length;

    if (params.dataCoverageScore < 40) {
      return 'manual';
    }

    if (metricBreaches > 0) {
      return 'critical';
    }

    if (failedReadiness > 0 || atRisk > 0 || params.goLiveReadinessScore < 85) {
      return 'watch';
    }

    if (manualReadiness > 0) {
      return 'manual';
    }

    if (params.overallComplianceScore >= 90 && params.goLiveReadinessScore >= 90) {
      return 'healthy';
    }

    return 'manual';
  }
}
