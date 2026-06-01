export interface SellerCODRiskRecord {
  id: string;
  sellerId: string;
  disputeRate: number;
  codSuspended: boolean;
  suspendedAt: Date | null;
  reinstatedAt: Date | null;
  lastComputedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SellerCODRiskEventRecord {
  id: string;
  sellerId: string;
  /** 'SUSPENDED' | 'REINSTATED' | 'SIGNAL_RECORDED' */
  eventType: string;
  signalType: string | null;
  disputeRateAtEvent: number;
  createdAt: Date;
}

export interface ISellerCODRiskRepository {
  findBySellerId(sellerId: string): Promise<SellerCODRiskRecord | null>;
  upsert(record: Omit<SellerCODRiskRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<SellerCODRiskRecord>;
}

export interface ISellerCODRiskEventRepository {
  save(event: Omit<SellerCODRiskEventRecord, 'id' | 'createdAt'>): Promise<void>;
  findBySellerIdSince(sellerId: string, since: Date): Promise<SellerCODRiskEventRecord[]>;
}
