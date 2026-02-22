import { CreateCampaignUseCase } from '../create-campaign.use-case';
import { PauseCampaignUseCase } from '../pause-campaign.use-case';
import { CancelCampaignUseCase } from '../cancel-campaign.use-case';

describe('CreateCampaignUseCase', () => {
    let useCase: CreateCampaignUseCase;
    let mockRepository: any;

    const validDto = {
        name: 'Summer Sale',
        type: 'DISCOUNT',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        timezone: 'Africa/Dar_es_Salaam',
        pricingRules: [{ type: 'PERCENTAGE', value: 20, priority: 1, conditions: [] }],
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = { save: jest.fn() };
        useCase = new CreateCampaignUseCase(mockRepository);
    });

    it('should create campaign successfully', async () => {
        const result = await useCase.execute('seller-1', 'admin-1', validDto);
        expect(result).toBeDefined();
        expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should add pricing rules', async () => {
        await useCase.execute('seller-1', 'admin-1', validDto);
        expect(mockRepository.save).toHaveBeenCalledWith(expect.objectContaining({ pricingRules: expect.any(Array) }));
    });

    it('should add products when provided', async () => {
        const dtoWithProducts = { ...validDto, productIds: ['prod-1', 'prod-2'] };
        await useCase.execute('seller-1', 'admin-1', dtoWithProducts);
        expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should add categories when provided', async () => {
        const dtoWithCategories = { ...validDto, categoryIds: ['cat-1', 'cat-2'] };
        await useCase.execute('seller-1', 'admin-1', dtoWithCategories);
        expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should add conditions when provided', async () => {
        const dtoWithConditions = { ...validDto, conditions: [{ type: 'MIN_PURCHASE', operator: 'GREATER_THAN', value: 100 }] };
        await useCase.execute('seller-1', 'admin-1', dtoWithConditions);
        expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should handle different campaign types', async () => {
        const types = ['DISCOUNT', 'BOGO', 'FREE_SHIPPING'];
        for (const type of types) {
            jest.clearAllMocks();
            await useCase.execute('seller-1', 'admin-1', { ...validDto, type });
            expect(mockRepository.save).toHaveBeenCalled();
        }
    });
});

describe('PauseCampaignUseCase', () => {
    let useCase: PauseCampaignUseCase;
    let mockRepository: any;

    const mockCampaign = { id: 'camp-1', pause: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = {
            findById: jest.fn().mockResolvedValue(mockCampaign),
            save: jest.fn(),
        };
        useCase = new PauseCampaignUseCase(mockRepository);
    });

    it('should pause campaign successfully', async () => {
        await useCase.execute('camp-1');
        expect(mockCampaign.pause).toHaveBeenCalled();
        expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should fail when campaign not found', async () => {
        mockRepository.findById.mockResolvedValue(null);
        await expect(useCase.execute('invalid')).rejects.toThrow();
    });
});

describe('CancelCampaignUseCase', () => {
    let useCase: CancelCampaignUseCase;
    let mockRepository: any;

    const mockCampaign = { id: 'camp-1', cancel: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = {
            findById: jest.fn().mockResolvedValue(mockCampaign),
            save: jest.fn(),
        };
        useCase = new CancelCampaignUseCase(mockRepository);
    });

    it('should cancel campaign successfully', async () => {
        await useCase.execute('camp-1');
        expect(mockCampaign.cancel).toHaveBeenCalled();
        expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should fail when campaign not found', async () => {
        mockRepository.findById.mockResolvedValue(null);
        await expect(useCase.execute('invalid')).rejects.toThrow();
    });
});
