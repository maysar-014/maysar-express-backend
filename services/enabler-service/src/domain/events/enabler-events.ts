export class EnablerRegisteredEvent {
    constructor(
        public readonly enablerId: string,
        public readonly userId: string,
        public readonly timestamp: Date = new Date()
    ) { }
}

export class ProductListedEvent {
    constructor(
        public readonly listingId: string,
        public readonly enablerId: string,
        public readonly productId: string,
        public readonly timestamp: Date = new Date()
    ) { }
}

export class OrderFacilitatedEvent {
    constructor(
        public readonly orderId: string,
        public readonly enablerId: string,
        public readonly amount: number,
        public readonly timestamp: Date = new Date()
    ) { }
}

export class CommissionEarnedEvent {
    constructor(
        public readonly commissionId: string,
        public readonly enablerId: string,
        public readonly amount: number,
        public readonly timestamp: Date = new Date()
    ) { }
}

export class TaskAssignedEvent {
    constructor(
        public readonly taskId: string,
        public readonly enablerId: string,
        public readonly sellerId: string,
        public readonly taskType: string,
        public readonly value: number,
        public readonly timestamp: Date = new Date()
    ) { }
}

// ── Enabler capability lifecycle events (§50) ────────────────────────────────
// Emitted for meaningful state changes only — not for every internal call.

export class EnablerTermsAcceptedEvent {
    constructor(
        public readonly enablerId: string,
        public readonly userId: string,
        public readonly termsVersion: string,
        public readonly acceptedAt: Date = new Date()
    ) { }
}

export class EnablerTrainingRecordedEvent {
    constructor(
        public readonly enablerId: string,
        public readonly userId: string,
        public readonly trainingStatus: string,
        public readonly recordedAt: Date = new Date()
    ) { }
}

export class EnablerActivatedEvent {
    constructor(
        public readonly enablerId: string,
        public readonly userId: string,
        public readonly activatedAt: Date = new Date()
    ) { }
}

export class EnablerRestrictedEvent {
    constructor(
        public readonly enablerId: string,
        public readonly reason: string,
        public readonly occurredAt: Date = new Date()
    ) { }
}

export class EnablerSuspendedEvent {
    constructor(
        public readonly enablerId: string,
        public readonly reason: string,
        public readonly occurredAt: Date = new Date()
    ) { }
}

export class EnablerReactivatedEvent {
    constructor(
        public readonly enablerId: string,
        public readonly occurredAt: Date = new Date()
    ) { }
}

export class EnablerDeactivatedEvent {
    constructor(
        public readonly enablerId: string,
        public readonly reason: string,
        public readonly occurredAt: Date = new Date()
    ) { }
}
