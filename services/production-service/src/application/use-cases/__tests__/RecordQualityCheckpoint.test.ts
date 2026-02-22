import { RecordQualityCheckpoint } from '../RecordQualityCheckpoint';

const mockRepository = { create: jest.fn() } as any;
const mockEngine = { assessQuality: jest.fn() } as any;

describe('RecordQualityCheckpoint', () => {
    let useCase: RecordQualityCheckpoint;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new RecordQualityCheckpoint(mockRepository, mockEngine);
    });

    it('should record quality checkpoint', async () => {
        mockEngine.assessQuality.mockReturnValue({ passed: true, score: 95 });
        const result = await useCase.execute({ productId: 'p1', metrics: {} });
        expect(result.passed).toBe(true);
    });
});
