/**
 * FairnessFlagRepository (Phase 6 §6.1)
 *
 * Flags are visible, not silent (backlog rule 9): every failed fairness check
 * is persisted and surfaced to ops. Rows are created once and only mutated
 * by resolution (resolvedAt / resolvedBy).
 */

export interface FairnessFlagInput {
  optionId?: string | null;
  deliveryJobId?: string | null;
  checkType: string;
  computedValue: number;
  threshold: number;
  detail?: string | null;
}

export interface FairnessFlagRepository {
  save(input: FairnessFlagInput): Promise<void>;
  findUnresolved(): Promise<Array<Record<string, any>>>;
}
