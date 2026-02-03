export enum TrainingStatus {
    NOT_STARTED = 'NOT_STARTED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    EXPIRED = 'EXPIRED'
}

export class TrainingStatusHelper {
    public static canTransitionTo(current: TrainingStatus, next: TrainingStatus): boolean {
        switch (current) {
            case TrainingStatus.NOT_STARTED:
                return next === TrainingStatus.IN_PROGRESS;
            case TrainingStatus.IN_PROGRESS:
                return next === TrainingStatus.COMPLETED || next === TrainingStatus.FAILED;
            case TrainingStatus.COMPLETED:
                return next === TrainingStatus.EXPIRED;
            case TrainingStatus.FAILED:
                return next === TrainingStatus.IN_PROGRESS;
            case TrainingStatus.EXPIRED:
                return next === TrainingStatus.IN_PROGRESS;
            default:
                return false;
        }
    }

    public static isActive(status: TrainingStatus): boolean {
        return status === TrainingStatus.IN_PROGRESS;
    }

    public static isTerminal(status: TrainingStatus): boolean {
        return status === TrainingStatus.COMPLETED || status === TrainingStatus.FAILED || status === TrainingStatus.EXPIRED;
    }
}
