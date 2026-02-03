import { TrainingStatus } from '../value-objects/training-status.value-object';
import { TrainingScore } from '../value-objects/training-score.value-object';

export interface TrainingRecordProps {
    id: string;
    learnerId: string;
    learnerRole: string;
    moduleId: string;
    status: TrainingStatus;
    startedAt?: Date;
    completedAt?: Date;
    score?: TrainingScore;
    attempts: number;
    expiresAt?: Date;
}

export class TrainingRecord {
    private constructor(private props: TrainingRecordProps) { }

    public static create(props: TrainingRecordProps): TrainingRecord {
        return new TrainingRecord(props);
    }

    public static createNew(id: string, learnerId: string, learnerRole: string, moduleId: string): TrainingRecord {
        return new TrainingRecord({
            id,
            learnerId,
            learnerRole,
            moduleId,
            status: TrainingStatus.NOT_STARTED,
            attempts: 0
        });
    }

    get id(): string { return this.props.id; }
    get learnerId(): string { return this.props.learnerId; }
    get learnerRole(): string { return this.props.learnerRole; }
    get moduleId(): string { return this.props.moduleId; }
    get status(): TrainingStatus { return this.props.status; }
    get startedAt(): Date | undefined { return this.props.startedAt; }
    get completedAt(): Date | undefined { return this.props.completedAt; }
    get score(): TrainingScore | undefined { return this.props.score; }
    get attempts(): number { return this.props.attempts; }
    get expiresAt(): Date | undefined { return this.props.expiresAt; }


    public start(): void {
        if (this.props.status !== TrainingStatus.NOT_STARTED && this.props.status !== TrainingStatus.FAILED && this.props.status !== TrainingStatus.EXPIRED) {
            throw new Error(`Cannot start training from status ${this.props.status}`);
        }
        this.props.status = TrainingStatus.IN_PROGRESS;
        this.props.startedAt = new Date();
        this.props.attempts++;
    }

    public complete(score: TrainingScore, passingScore: number, validityPeriodDays: number): void {
        if (this.props.status !== TrainingStatus.IN_PROGRESS) {
            throw new Error('Training not in progress');
        }

        const passed = score.getValue() >= passingScore;
        this.props.status = passed ? TrainingStatus.COMPLETED : TrainingStatus.FAILED;
        this.props.completedAt = new Date();
        this.props.score = score;

        if (passed) {
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + validityPeriodDays);
            this.props.expiresAt = expirationDate;
        }
    }

    public fail(): void {
        if (this.props.status !== TrainingStatus.IN_PROGRESS) {
            throw new Error('Training not in progress');
        }
        this.props.status = TrainingStatus.FAILED;
        this.props.completedAt = new Date();
    }

    public expire(): void {
        if (this.props.status !== TrainingStatus.COMPLETED) {
            throw new Error('Only completed training can expire');
        }
        this.props.status = TrainingStatus.EXPIRED;
    }

    public isExpired(): boolean {
        if (!this.props.expiresAt) return false;
        return new Date() > this.props.expiresAt;
    }

    public canRetake(maxAttempts: number): boolean {
        return (this.props.status === TrainingStatus.FAILED || this.props.status === TrainingStatus.EXPIRED) &&
            this.props.attempts < maxAttempts;
    }

    public toJSON() {
        return {
            ...this.props,
            score: this.props.score?.getValue(),
            status: this.props.status
        };
    }
}
