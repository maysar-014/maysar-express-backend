import { PrismaClient } from '@prisma/client';
import { PrismaCampaignRepository } from '../prisma-campaign.repository';
import { Campaign } from '../../../domain/campaign.entity';
import { CampaignType, CampaignStatus } from '../../../domain/enums';
import { CampaignSchedule } from '../../../domain/value-objects/campaign-schedule.value-object';
import { CampaignMetadata } from '../../../domain/value-objects/campaign-metadata.value-object';

// Mock Prisma client
jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({
        campaign_Campaign: {
            upsert: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn()
        }
    }))
}));

describe('PrismaCampaignRepository', () => {
    let repository: PrismaCampaignRepository;
    let mockPrisma: any;

    beforeEach(() => {
        mockPrisma = new PrismaClient();
        repository = new PrismaCampaignRepository(mockPrisma);
    });

    it('should find a campaign by id', async () => {
        const startDate = new Date('2026-03-27T10:00:00.000Z');
        const endDate = new Date('2026-03-28T10:00:00.000Z');
        const mockCampaignData = {
            id: 'campaign-1',
            name: 'Test Campaign',
            type: 'percentage_discount',
            status: 'draft',
            startDate,
            endDate,
            timezone: 'UTC',
            sellerId: 'seller-1',
            createdBy: 'user-1',
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date(),
            pricingRules: [],
            conditions: [],
            products: [],
            categories: []
        };

        mockPrisma.campaign_Campaign.findUnique.mockResolvedValue(mockCampaignData);

        const result = await repository.findById('campaign-1');

        expect(result).toBeDefined();
        expect(result?.getId()).toBe('campaign-1');
        expect(mockPrisma.campaign_Campaign.findUnique).toHaveBeenCalled();
    });

    it('should return null if campaign not found', async () => {
        mockPrisma.campaign_Campaign.findUnique.mockResolvedValue(null);

        const result = await repository.findById('non-existent');

        expect(result).toBeNull();
    });
});
