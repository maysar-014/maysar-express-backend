import { RestrictionRecord } from '../engines/cod-trust/trust-signal.types';

export interface CreateRestrictionDTO {
  buyerId: string;
  reason: string;
  endsAt: Date;
  permanent?: boolean;
}

export interface ICODRestrictionRepository {
  /**
   * Find all active restrictions for a buyer.
   * Active = permanent OR endsAt > now().
   */
  findActiveByBuyerId(buyerId: string): Promise<RestrictionRecord[]>;

  /**
   * Persist a new restriction record.
   */
  save(dto: CreateRestrictionDTO): Promise<RestrictionRecord>;

  /**
   * Extend an existing restriction to the later of its current endsAt and the new endsAt.
   */
  extendRestriction(buyerId: string, newEndsAt: Date): Promise<void>;
}
