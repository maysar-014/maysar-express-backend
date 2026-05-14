import { ScoreEventRecord, TrustSignalType } from '../engines/cod-trust/trust-signal.types';

export interface AppendScoreEventDTO {
  buyerId: string;
  signalType: TrustSignalType;
  delta: number;
  scoreBefore: number;
  scoreAfter: number;
  sourceService: string;
  sourceEntityId: string;
}

export interface ICODScoreEventRepository {
  /**
   * Append an immutable score event to the audit log.
   */
  append(dto: AppendScoreEventDTO): Promise<ScoreEventRecord>;

  /**
   * Retrieve all score events for a buyer in ascending chronological order.
   */
  findByBuyerId(buyerId: string): Promise<ScoreEventRecord[]>;
}
