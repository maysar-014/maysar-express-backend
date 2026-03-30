interface EnrollmentRecord {
    id: string;
    progress?: number;
    completed?: boolean;
    completedAt?: Date;
    certificateIssued?: boolean;
    [key: string]: unknown;
}

interface EnrollmentRepository {
    findById(enrollmentId: string): Promise<EnrollmentRecord | null> | EnrollmentRecord | null;
    update(enrollmentId: string, updates: Partial<EnrollmentRecord>): Promise<unknown> | unknown;
}

interface EventBus {
    publish(eventName: string, payload: EnrollmentRecord): Promise<unknown> | unknown;
}

export class CompleteCourseUseCase {
    constructor(
        private readonly repository: EnrollmentRepository,
        private readonly eventBus: EventBus
    ) {}

    async execute(dto: { enrollmentId: string }): Promise<EnrollmentRecord> {
        const enrollment = await this.repository.findById(dto.enrollmentId);
        if (!enrollment) throw new Error('Enrollment not found');
        if (enrollment.completed) throw new Error('Course already completed');
        if ((enrollment.progress ?? 0) < 100) throw new Error('Course not fully completed');

        const completedAt = new Date();
        const completedEnrollment: EnrollmentRecord = {
            ...enrollment,
            completed: true,
            completedAt,
            certificateIssued: true
        };

        await this.repository.update(dto.enrollmentId, {
            completed: true,
            completedAt,
            certificateIssued: true
        });
        await this.eventBus.publish('CourseCompleted.v1', completedEnrollment);
        return completedEnrollment;
    }
}
