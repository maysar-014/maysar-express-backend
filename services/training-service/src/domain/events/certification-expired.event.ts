export interface CertificationExpiredEvent {
    learnerId: string;
    learnerRole: string;
    moduleId: string;
    expiredAt: Date;
}
