export type FounderMetricStatus = 'automated' | 'derived' | 'manual';

export interface FounderMetricDTO {
  key: string;
  label: string;
  value: number | null;
  unit: 'count' | 'percent' | 'currency' | 'hours' | 'days';
  status: FounderMetricStatus;
  source: string;
  note?: string;
}

export interface FounderPromptDTO {
  label: string;
  value: string;
}

export interface FounderBottleneckDTO {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
}

export interface FounderPhaseDTO {
  key: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  prayerName: string;
  mode: string;
  stateShift: string;
  objective: string;
  adminPanelSection: string;
  actions: string[];
  metrics: FounderMetricDTO[];
  rule?: string;
  guidingQuestion?: string;
  outputs?: FounderPromptDTO[];
}

export interface FounderWeeklyReviewDTO {
  cadence: string;
  objective: string;
  actions: string[];
  metrics: FounderMetricDTO[];
  redesignPrompt: string;
}

export interface FounderDataGapDTO {
  key: string;
  label: string;
  reason: string;
  suggestedSource: string;
}

export interface FounderOperatingSystemDashboardDTO {
  title: string;
  generatedAt: Date;
  currentBottleneck: FounderBottleneckDTO;
  primaryObjective: string;
  criticalTasks: string[];
  dailyWinStatement: string;
  phases: FounderPhaseDTO[];
  weeklyReview: FounderWeeklyReviewDTO;
  dataGaps: FounderDataGapDTO[];
}
