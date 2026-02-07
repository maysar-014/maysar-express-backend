import { CreateCampaignUseCase } from '../create-campaign.use-case';
import { CampaignType } from '../../domain/enums';
import { CreateCampaignDto } from '../../dto/create-campaign.dto';

describe('CreateCampaignUseCase', () => {
    let useCase: CreateCampaignUseCase;
    let mockRepo: any;
    let mockPublisher: any;
    let mockLogger: any;

    beforeEach(() => {
        mockRepo = {
            save: jest.fn().mockResolvedValue(undefined)
        };
        mockPublisher = {
            publish: jest.fn().mockResolvedValue(undefined)
        };
        mockLogger = {
            info: jest.fn(),
            error: jest.fn()
        };
        useCase = new CreateCampaignUseCase(mockRepo, mockPublisher, mockLogger);
    });

    it('should create and save a campaign successfully', async () => {
        const dto: CreateCampaignDto = {
            name: 'Holiday Sale',
            description: 'Winter season discount',
            type: CampaignType.PERCENTAGE_DISCOUNT,
            startDate: new Date(Date.now() + 86400000).toISOString(),
            endDate: new Date(Date.now() + 172800000).toISOString(),
            timezone: 'UTC',
            pricingRules: [
                { type: 'percentage_discount' as any, value: 20, priority: 1 }
            ]
        };

        const result = await useCase.execute('seller-1', 'user-1', dto);

        expect(result.success).toBe(true);
        expect(mockRepo.save).toHaveBeenCalled();
        expect(mockPublisher.publish).toHaveBeenCalled();
    });

    it('should fail if repository save fails', async () => {
        mockRepo.save.mockRejectedValue(new Error('DB Error'));

        const dto: CreateCampaignDto = {
            name: 'Holiday Sale',
            description: 'Winter season discount',
            type: CampaignType.PERCENTAGE_DISCOUNT,
            startDate: new Date(Date.now() + 86400000).toISOString(),
            endDate: new Date(Date.now() + 172800000).toISOString(),
            timezone: 'UTC',
            pricingRules: [] as any
        };

        await expect(useCase.execute('seller-1', 'user-1', dto)).rejects.toThrow('DB Error');
    });
});
