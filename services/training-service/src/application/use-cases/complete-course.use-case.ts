export class CompleteCourseUseCase {
    constructor(
        private readonly repository: any,
        private readonly eventBus: any
    ) {}

    async execute(dto: { enrollmentId: string }) {
        const enrollment = await this.repository.findById(dto.enrollmentId);
        if (!enrollment) throw new Error('Enrollment not found');
        if (enrollment.progress < 100) throw new Error('Course not fully completed');

        enrollment.completed = true;
        await this.repository.update(enrollment);
        await this.eventBus.publish('CourseCompleted.v1', enrollment);
        return enrollment;
    }
}
