
export interface ProductionScheduledEvent {
    type: 'ProductionScheduled';
    payload: {
        orderId: string;
        timestamp: Date;
    };
}

export interface ProductionCompletedEvent {
    type: 'ProductionCompleted';
    payload: {
        orderId: string;
        producedQty: number;
        timestamp: Date;
    };
}

export interface QualityCheckFailedEvent {
    type: 'QualityCheckFailed';
    payload: {
        orderId: string;
        reason: string;
        timestamp: Date;
    };
}

// Add other events as needed
