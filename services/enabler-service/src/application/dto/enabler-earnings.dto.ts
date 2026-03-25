import type { EnablerCommissionStatus } from '../../domain/repositories/enabler-commission.repository.interface';

export interface GetEnablerEarningsLedgerQueryDto {
  status?: EnablerCommissionStatus;
  page?: number;
  limit?: number;
}

export interface EnablerEarningsLedgerEntryDto {
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
  approvedAt: string | null;
  holdUntil: string | null;
  paidAt: string | null;
  payoutId: string | null;
  paymentMethod: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnablerEarningsSummaryDto {
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
  lastPaidAt: string | null;
}

export interface EnablerEarningsLedgerResponseDto {
  items: EnablerEarningsLedgerEntryDto[];
  summary: EnablerEarningsSummaryDto;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
