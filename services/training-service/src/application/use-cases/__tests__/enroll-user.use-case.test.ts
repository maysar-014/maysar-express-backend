import { EnrollUserUseCase } from '../enroll-user.use-case';

const mockRepository = { save: jest.fn(), findById: jest.fn() } as any;
const mockEventBus = { publish: jest.fn() } as any;

describe('EnrollUserUseCase', () => {
    let useCase: EnrollUserUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new EnrollUserUseCase(mockRepository, mockEventBus);
    });

    it('should enroll user successfully', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'course-1', capacity: 10, enrolled: 5 });
        const result = await useCase.execute({ userId: 'user-1', courseId: 'course-1' });
        expect(result.success).toBe(true);
        expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should fail if course is full', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'course-1', capacity: 10, enrolled: 10 });
        await expect(useCase.execute({ userId: 'user-1', courseId: 'course-1' }))
            .rejects.toThrow('Course is full');
    });

    it('should fail if course not found', async () => {
        mockRepository.findById.mockResolvedValue(null);
        await expect(useCase.execute({ userId: 'user-1', courseId: 'course-1' }))
            .rejects.toThrow('Course not found');
    });

    it('should prevent duplicate enrollment', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'course-1', capacity: 10, enrolled: 5 });
        mockRepository.save.mockRejectedValue(new Error('User already enrolled'));
        await expect(useCase.execute({ userId: 'user-1', courseId: 'course-1' }))
            .rejects.toThrow('User already enrolled');
    });

    it('should publish enrollment event', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'course-1', capacity: 10, enrolled: 5 });
        await useCase.execute({ userId: 'user-1', courseId: 'course-1' });
        expect(mockEventBus.publish).toHaveBeenCalledWith('UserEnrolled.v1', expect.any(Object));
    });

    it('should initialize progress to zero', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'course-1', capacity: 10, enrolled: 5 });
        await useCase.execute({ userId: 'user-1', courseId: 'course-1' });
        expect(mockRepository.save).toHaveBeenCalledWith(expect.objectContaining({ progress: 0 }));
    });

    it('should handle enrollment with prerequisites', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'course-1', capacity: 10, enrolled: 5, prerequisites: ['course-0'] });
        const result = await useCase.execute({ userId: 'user-1', courseId: 'course-1', completedPrerequisites: ['course-0'] });
        expect(result.success).toBe(true);
    });
});
