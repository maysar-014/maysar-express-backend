import { ActivateCampaignUseCase } from '../activate-campaign.use-case';
import { LaunchCampaignUseCase } from '../launch-campaign.use-case';
import { ResumeCampaignUseCase } from '../resume-campaign.use-case';
import { CompleteCampaignUseCase } from '../complete-campaign.use-case';
import { UpdateCampaignUseCase } from '../update-campaign.use-case';
import { GetCampaignUseCase } from '../get-campaign.use-case';
import { ListCampaignsUseCase } from '../list-campaigns.use-case';
import { ScheduleCampaignUseCase } from '../schedule-campaign.use-case';

describe('ActivateCampaignUseCase', () => {
    let useCase: ActivateCampaignUseCase;
    let mockRepository: any;
    const mockCampaign = { id: 'camp-1', activate: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = { findById: jest.fn().mockResolvedValue(mockCampaign), save: jest.fn() };
        useCase = new ActivateCampaignUseCase(mockRepository);
    });

    it('should activate campaign', async () => {
        await useCase.execute('camp-1');
        expect(mockCampaign.activate).toHaveBeenCalled();
    });

    it('should fail when not found', async () => {
        mockRepository.findById.mockResolvedValue(null);
        await expect(useCase.execute('invalid')).rejects.toThrow();
    });
});

describe('LaunchCampaignUseCase', () => {
    let useCase: LaunchCampaignUseCase;
    let mockRepository: any;
    const mockCampaign = { id: 'camp-1', launch: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = { findById: jest.fn().mockResolvedValue(mockCampaign), save: jest.fn() };
        useCase = new LaunchCampaignUseCase(mockRepository);
    });

    it('should launch campaign', async () => {
        await useCase.execute('camp-1');
        expect(mockCampaign.launch).toHaveBeenCalled();
    });
});

describe('ResumeCampaignUseCase', () => {
    let useCase: ResumeCampaignUseCase;
    let mockRepository: any;
    const mockCampaign = { id: 'camp-1', resume: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = { findById: jest.fn().mockResolvedValue(mockCampaign), save: jest.fn() };
        useCase = new ResumeCampaignUseCase(mockRepository);
    });

    it('should resume campaign', async () => {
        await useCase.execute('camp-1');
        expect(mockCampaign.resume).toHaveBeenCalled();
    });
});

describe('CompleteCampaignUseCase', () => {
    let useCase: CompleteCampaignUseCase;
    let mockRepository: any;
    const mockCampaign = { id: 'camp-1', complete: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = { findById: jest.fn().mockResolvedValue(mockCampaign), save: jest.fn() };
        useCase = new CompleteCampaignUseCase(mockRepository);
    });

    it('should complete campaign', async () => {
        await useCase.execute('camp-1');
        expect(mockCampaign.complete).toHaveBeenCalled();
    });
});

describe('UpdateCampaignUseCase', () => {
    let useCase: UpdateCampaignUseCase;
    let mockRepository: any;
    const mockCampaign = { id: 'camp-1', update: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = { findById: jest.fn().mockResolvedValue(mockCampaign), save: jest.fn() };
        useCase = new UpdateCampaignUseCase(mockRepository);
    });

    it('should update campaign', async () => {
        await useCase.execute('camp-1', { name: 'Updated Name' });
        expect(mockRepository.save).toHaveBeenCalled();
    });
});

describe('GetCampaignUseCase', () => {
    let useCase: GetCampaignUseCase;
    let mockRepository: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = { findById: jest.fn().mockResolvedValue({ id: 'camp-1', name: 'Campaign' }) };
        useCase = new GetCampaignUseCase(mockRepository);
    });

    it('should get campaign', async () => {
        const result = await useCase.execute('camp-1');
        expect(result).toBeDefined();
    });

    it('should return null when not found', async () => {
        mockRepository.findById.mockResolvedValue(null);
        const result = await useCase.execute('invalid');
        expect(result).toBeNull();
    });
});

describe('ListCampaignsUseCase', () => {
    let useCase: ListCampaignsUseCase;
    let mockRepository: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = { findAll: jest.fn().mockResolvedValue([{ id: 'camp-1' }]) };
        useCase = new ListCampaignsUseCase(mockRepository);
    });

    it('should list campaigns', async () => {
        const result = await useCase.execute({ sellerId: 'seller-1' });
        expect(result).toHaveLength(1);
    });
});

describe('ScheduleCampaignUseCase', () => {
    let useCase: ScheduleCampaignUseCase;
    let mockRepository: any;
    const mockCampaign = { id: 'camp-1', schedule: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = { findById: jest.fn().mockResolvedValue(mockCampaign), save: jest.fn() };
        useCase = new ScheduleCampaignUseCase(mockRepository);
    });

    it('should schedule campaign', async () => {
        await useCase.execute('camp-1', { startDate: new Date(), endDate: new Date() });
        expect(mockRepository.save).toHaveBeenCalled();
    });
});
