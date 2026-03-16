import { ApproveEnablerUseCase } from '../approve-enabler.use-case';

const mockRepository = { findById: jest.fn(), update: jest.fn(), findByCode: jest.fn() } as any;
const mockPublisher = { publish: jest.fn() } as any;

describe('ApproveEnablerUseCase', () => {
    let useCase: ApproveEnablerUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new ApproveEnablerUseCase(mockRepository, mockPublisher);
    });

    it('should approve enabler', async () => {
        mockRepository.findById.mockResolvedValue({
            id: 'e1',
            status: 'PENDING',
            approve: jest.fn(),
            assignEnablerCode: jest.fn(),
            toPlainObject: () => ({ verificationStatus: 'pending' })
        });
        mockRepository.findByCode.mockResolvedValue(null);
        await useCase.execute('e1', 'admin-1');
        expect(mockRepository.update).toHaveBeenCalled();
    });
});
