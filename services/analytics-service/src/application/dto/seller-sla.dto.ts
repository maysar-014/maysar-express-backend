import type {
  SellerSlaBreach,
  SellerSlaCoverageItem,
  SellerSlaEvaluationMode,
  SellerSlaFacts,
  SellerSlaMetricAssessment,
  SellerSlaReadinessGate,
  SellerSlaReport,
  SellerSlaReportStatus,
  SellerSlaSummary
} from '../../domain/engines/SellerSlaEngine';

export type {
  SellerSlaBreach,
  SellerSlaCoverageItem,
  SellerSlaEvaluationMode,
  SellerSlaFacts,
  SellerSlaMetricAssessment,
  SellerSlaReadinessGate,
  SellerSlaReport,
  SellerSlaReportStatus,
  SellerSlaSummary
};

export interface SellerSlaExecutionResultDTO {
  report: SellerSlaReport;
  persistence?: {
    actionItemsUpserted: number;
    actionItemsResolved: number;
    eventId: string;
  };
}

export interface SellerSlaQueryDTO {
  sellerId: string;
  lookbackDays?: number;
}

