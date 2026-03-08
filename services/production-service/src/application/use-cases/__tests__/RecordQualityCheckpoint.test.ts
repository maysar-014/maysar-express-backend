import { RecordQualityCheckpoint } from '../RecordQualityCheckpoint';

const mockRepository = { save: jest.fn() } as any;
const mockEngine = { assessQuality: jest.fn() } as any;

describe('RecordQualityCheckpoint', () => {
    let useCase: RecordQualityCheckpoint;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new RecordQualityCheckpoint(mockRepository, mockEngine);
    });

    it('should record quality checkpoint', async () => {
        mockRepository.save.mockResolvedValue(undefined);
        await useCase.execute({ orderId: 'o1', passed: true, defectCount: 0 });
        expect(mockRepository.save).toHaveBeenCalled();
    });
});
