export class EnrollUserUseCase {
    constructor(
        private readonly repository: any,
        private readonly eventBus: any
    ) {}

    async execute(dto: { userId: string; courseId: string }) {
        const course = await this.repository.findById(dto.courseId);
        if (!course) throw new Error('Course not found');
        if (course.enrolled >= course.capacity) throw new Error('Course is full');

        const enrollment = { id: `enroll-${Date.now()}`, ...dto, progress: 0 };
        await this.repository.save(enrollment);
        return { success: true };
    }
}
