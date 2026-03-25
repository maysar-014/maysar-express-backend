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
