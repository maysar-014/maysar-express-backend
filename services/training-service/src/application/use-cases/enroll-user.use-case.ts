interface CourseRecord {
    id: string;
    capacity: number;
    enrolled: number;
    prerequisites?: string[];
}

interface EnrollmentRepository {
    findById(courseId: string): Promise<CourseRecord | null> | CourseRecord | null;
    save(enrollment: Record<string, unknown>): Promise<unknown> | unknown;
}

interface EventBus {
    publish(eventName: string, payload: Record<string, unknown>): Promise<unknown> | unknown;
}

export interface EnrollUserDto {
    userId: string;
    courseId: string;
    completedPrerequisites?: string[];
}

export class EnrollUserUseCase {
    constructor(
        private readonly repository: EnrollmentRepository,
        private readonly eventBus: EventBus
    ) {}

    async execute(dto: EnrollUserDto) {
        const course = await this.repository.findById(dto.courseId);
        if (!course) throw new Error('Course not found');
        if (course.enrolled >= course.capacity) throw new Error('Course is full');

        const completedPrerequisites = Array.isArray(dto.completedPrerequisites)
            ? dto.completedPrerequisites
            : [];

        const enrollment = {
            id: `enroll-${Date.now()}`,
            userId: dto.userId,
            courseId: dto.courseId,
            progress: 0,
            ...(completedPrerequisites.length > 0 ? { completedPrerequisites } : {})
        };

        await this.repository.save(enrollment);
        await this.eventBus.publish('UserEnrolled.v1', enrollment);
        return { success: true };
    }
}
