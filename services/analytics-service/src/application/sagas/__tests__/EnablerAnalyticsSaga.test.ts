import { EnablerAnalyticsSaga } from '../EnablerAnalyticsSaga';
import { EnablerAnalyticsEngine } from '../../../domain/engines/EnablerAnalyticsEngine';
import { EnablerAnalyticsRepository } from '../../../infrastructure/repositories/EnablerAnalyticsRepository';
import { IEventBus } from '../../../domain/interfaces/IEventBus';

jest.mock('../../../domain/engines/EnablerAnalyticsEngine');
jest.mock('../../../infrastructure/repositories/EnablerAnalyticsRepository');

describe('EnablerAnalyticsSaga', () => {
    let saga: EnablerAnalyticsSaga;
    let eventBus: jest.Mocked<IEventBus>;
    let engine: jest.Mocked<EnablerAnalyticsEngine>;
    let repository: jest.Mocked<EnablerAnalyticsRepository>;

    beforeEach(() => {
        jest.clearAllMocks();
        eventBus = {
            publish: jest.fn(),
            subscribe: jest.fn()
        } as unknown as jest.Mocked<IEventBus>;

        engine = new EnablerAnalyticsEngine() as jest.Mocked<EnablerAnalyticsEngine>;
        repository = new EnablerAnalyticsRepository() as jest.Mocked<EnablerAnalyticsRepository>;

        saga = new EnablerAnalyticsSaga(eventBus, engine, repository);
    });

    it('should subscribe to events', () => {
        expect(eventBus.subscribe).toHaveBeenCalled();
    });
});
