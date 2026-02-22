import { CompleteCourseUseCase } from '../complete-course.use-case';

const mockRepository = { findById: jest.fn(), update: jest.fn() } as any;
const mockEventBus = { publish: jest.fn() } as any;

describe('CompleteCourseUseCase', () => {
    let useCase: CompleteCourseUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new CompleteCourseUseCase(mockRepository, mockEventBus);
    });

    it('should complete course successfully', async () => {
        mockRepository.findById.mockResolvedValue({ 
            id: 'enrollment-1', 
            userId: 'user-1',
            courseId: 'course-1',
            progress: 100,
            completed: false
        });
        
        const result = await useCase.execute({ enrollmentId: 'enrollment-1' });
        expect(result.completed).toBe(true);
        expect(mockRepository.update).toHaveBeenCalled();
        expect(mockEventBus.publish).toHaveBeenCalledWith('CourseCompleted.v1', expect.any(Object));
    });

    it('should fail if progress incomplete', async () => {
        mockRepository.findById.mockResolvedValue({ 
            id: 'enrollment-1', 
            progress: 50,
            completed: false
        });
        
        await expect(useCase.execute({ enrollmentId: 'enrollment-1' }))
            .rejects.toThrow('Course not fully completed');
    });

    it('should fail if enrollment not found', async () => {
        mockRepository.findById.mockResolvedValue(null);
        await expect(useCase.execute({ enrollmentId: 'enrollment-1' }))
            .rejects.toThrow('Enrollment not found');
    });

    it('should not complete already completed course', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'enrollment-1', progress: 100, completed: true });
        await expect(useCase.execute({ enrollmentId: 'enrollment-1' }))
            .rejects.toThrow('Course already completed');
    });

    it('should issue certificate on completion', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'enrollment-1', progress: 100, completed: false });
        const result = await useCase.execute({ enrollmentId: 'enrollment-1' });
        expect(result.certificateIssued).toBe(true);
    });

    it('should update completion timestamp', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'enrollment-1', progress: 100, completed: false });
        await useCase.execute({ enrollmentId: 'enrollment-1' });
        expect(mockRepository.update).toHaveBeenCalledWith('enrollment-1', expect.objectContaining({ completedAt: expect.any(Date) }));
    });

    it('should handle repository update failure', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'enrollment-1', progress: 100, completed: false });
        mockRepository.update.mockRejectedValue(new Error('Update failed'));
        await expect(useCase.execute({ enrollmentId: 'enrollment-1' }))
            .rejects.toThrow('Update failed');
    });
});
