import { CreateCampaignUseCase } from '../create-campaign.use-case';
import { PauseCampaignUseCase } from '../pause-campaign.use-case';
import { CancelCampaignUseCase } from '../cancel-campaign.use-case';
import { CampaignMapper } from '../../mappers/campaign.mapper';
import { CampaignType, RuleType, ConditionType, OperatorType } from '../../../domain/types/campaign.types';
import type { ICampaignRepository } from '../../../domain/repositories/campaign.repository.interface';

type CampaignRepositoryMock = Partial<ICampaignRepository> & {
    save: jest.Mock;
    findById?: jest.Mock;
};

describe('CreateCampaignUseCase', () => {
    let useCase: CreateCampaignUseCase;
    let mockRepository: CampaignRepositoryMock;

    const validDto = {
        name: 'Summer Sale',
        type: CampaignType.DISCOUNT,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        timezone: 'Africa/Dar_es_Salaam',
        pricingRules: [{ type: RuleType.PERCENTAGE_DISCOUNT, value: 20, priority: 1, conditions: {} }],
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = {
            save: jest.fn(),
            findById: jest.fn(),
        };
        useCase = new CreateCampaignUseCase(mockRepository as ICampaignRepository);
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
        const dtoWithConditions = {
            ...validDto,
            conditions: [{ type: ConditionType.MIN_ORDER_VALUE, operator: OperatorType.GREATER_THAN, value: 100 }]
        };
        await useCase.execute('seller-1', 'admin-1', dtoWithConditions);
        expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should handle different campaign types', async () => {
        const types = [CampaignType.DISCOUNT, CampaignType.PROMOTION, CampaignType.CLEARANCE, CampaignType.SEASONAL];
        for (const type of types) {
            jest.clearAllMocks();
            await useCase.execute('seller-1', 'admin-1', { ...validDto, type });
            expect(mockRepository.save).toHaveBeenCalled();
        }
    });
});

describe('PauseCampaignUseCase', () => {
    let useCase: PauseCampaignUseCase;
    let mockRepository: CampaignRepositoryMock;

    const mockCampaign = { id: 'camp-1', pause: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(CampaignMapper, 'toDto').mockReturnValue({ id: 'camp-1' } as never);
        mockRepository = {
            findById: jest.fn().mockResolvedValue(mockCampaign),
            save: jest.fn(),
        };
        useCase = new PauseCampaignUseCase(mockRepository as unknown as ICampaignRepository);
    });

    it('should pause campaign successfully', async () => {
        await useCase.execute('camp-1');
        expect(mockCampaign.pause).toHaveBeenCalled();
        expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should fail when campaign not found', async () => {
        mockRepository.findById!.mockResolvedValue(null);
        await expect(useCase.execute('invalid')).rejects.toThrow();
    });
});

describe('CancelCampaignUseCase', () => {
    let useCase: CancelCampaignUseCase;
    let mockRepository: CampaignRepositoryMock;

    const mockCampaign = { id: 'camp-1', cancel: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(CampaignMapper, 'toDto').mockReturnValue({ id: 'camp-1' } as never);
        mockRepository = {
            findById: jest.fn().mockResolvedValue(mockCampaign),
            save: jest.fn(),
        };
        useCase = new CancelCampaignUseCase(mockRepository as unknown as ICampaignRepository);
    });

    it('should cancel campaign successfully', async () => {
        await useCase.execute('camp-1');
        expect(mockCampaign.cancel).toHaveBeenCalled();
        expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should fail when campaign not found', async () => {
        mockRepository.findById!.mockResolvedValue(null);
        await expect(useCase.execute('invalid')).rejects.toThrow();
    });
});
