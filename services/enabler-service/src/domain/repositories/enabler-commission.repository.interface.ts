import { EnablerCommissionEntity } from '../entities/enabler-commission.entity';

export type EnablerCommissionStatus =
  | 'pending'
  | 'approved'
  | 'paid'
  | 'on_hold'
  | 'disputed'
  | 'forfeited';

export interface EnablerCommissionLedgerQuery {
  status?: EnablerCommissionStatus;
  page?: number;
  limit?: number;
}

export interface EnablerCommissionLedgerEntry {
  id: string;
  enablerId: string;
  enablerOrderId: string;
  orderId: string | null;
  commissionId: string | null;
  status: string;
  baseCommission: number;
  tierBonus: number;
  performanceBonus: number;
  totalCommission: number;
  protectionStatus: string;
  fraudCheckStatus: string;
  approvedAt: Date | null;
  holdUntil: Date | null;
  paidAt: Date | null;
  payoutId: string | null;
  paymentMethod: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnablerCommissionLedgerResult {
  items: EnablerCommissionLedgerEntry[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface EnablerCommissionSummary {
  currency: 'TZS';
  totalCommission: number;
  totalPaid: number;
  totalPending: number;
  totalApproved: number;
  totalOnHold: number;
  totalDisputed: number;
  totalForfeited: number;
  totalOutstanding: number;
  counts: {
    all: number;
    pending: number;
    approved: number;
    paid: number;
    onHold: number;
    disputed: number;
    forfeited: number;
  };
  lastPaidAt: Date | null;
}

export interface IEnablerCommissionRepository {
  upsert(commission: EnablerCommissionEntity): Promise<void>;
  findLedgerByEnablerId(enablerId: string, query?: EnablerCommissionLedgerQuery): Promise<EnablerCommissionLedgerResult>;
  getSummaryByEnablerId(enablerId: string): Promise<EnablerCommissionSummary>;
}
