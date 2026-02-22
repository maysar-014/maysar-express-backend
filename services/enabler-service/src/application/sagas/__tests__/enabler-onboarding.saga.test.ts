import { EnablerOnboardingSaga } from '../enabler-onboarding.saga';

const mockRepo = { findById: jest.fn(), update: jest.fn() } as any;
const mockEventBus = { publish: jest.fn() } as any;

describe('EnablerOnboardingSaga', () => {
    let saga: EnablerOnboardingSaga;

    beforeEach(() => {
        jest.clearAllMocks();
        saga = new EnablerOnboardingSaga(mockRepo, mockEventBus);
    });

    it('should execute happy path', async () => {
        await saga.execute({ enablerId: 'e1' });
        expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should compensate on failure', async () => {
        mockRepo.findById.mockRejectedValue(new Error('Failed'));
        await expect(saga.execute({ enablerId: 'e1' })).rejects.toThrow();
    });
});
