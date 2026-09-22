export const ENFORCEMENT_ACTIONS = ['RESTRICT', 'SUSPEND', 'REACTIVATE', 'DEACTIVATE'] as const;

export type EnforcementActionType = (typeof ENFORCEMENT_ACTIONS)[number];

/**
 * Immutable record of an admin enforcement decision against an enabler (§34,
 * §52). Enforcement restricts capability — it never deletes the Maysar user.
 */
export interface EnablerEnforcementRecord {
    id: string;
    enablerId: string;
    action: EnforcementActionType;
    previousStatus: string;
    newStatus: string;
    reason?: string | null;
    actorUserId?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt: Date;
}

export interface IEnablerEnforcementRepository {
    record(entry: Omit<EnablerEnforcementRecord, 'id' | 'createdAt'>): Promise<void>;
    listForEnabler(enablerId: string, limit?: number): Promise<EnablerEnforcementRecord[]>;
}